import os
import re
import time
import json
import urllib.parse
import subprocess
import threading
import socket
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def load_env_local() -> Dict[str, str]:
    env_path = Path(".env.local")
    env: Dict[str, str] = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
        if not m:
            continue
        key = m.group(1)
        val = m.group(2).strip().strip('"').strip("'")
        env[key] = val
    return env


def abbrev(value: Optional[str]) -> str:
    if not value:
        return ""
    return value[:8]


def supabase_rest_get(
    base_url: str,
    service_role_key: str,
    table: str,
    query: str,
    select: str,
) -> List[Dict[str, Any]]:
    url = f"{base_url}/rest/v1/{table}?{query}&select={urllib.parse.quote(select)}"
    headers = {
        "apikey": service_role_key,
        "authorization": f"Bearer {service_role_key}",
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def detect_horizontal_scroll(page) -> bool:
    return bool(
        page.evaluate(
            """() => {
              const doc = document.documentElement;
              const body = document.body;
              const sw = Math.max(doc.scrollWidth, body.scrollWidth);
              const cw = Math.max(doc.clientWidth, body.clientWidth);
              return sw > cw + 2;
            }"""
        )
    )


def main() -> None:
    artifact_dir = Path("artifacts/pricing-final-v2")
    artifact_dir.mkdir(parents=True, exist_ok=True)
    env = load_env_local()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    service_role = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    desired_port = int(os.environ.get("PRICING_UI_PORT", "3100"))
    base_app_url = f"http://127.0.0.1:{desired_port}"
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind(("127.0.0.1", desired_port))
    except OSError as exc:
        raise RuntimeError(f"UI port {desired_port} is not available: {exc}") from exc
    finally:
        probe.close()
    print(f"[ui] starting production server on {base_app_url}", flush=True)

    owner_email = "owner-a@test-pricing.example.com"
    owner_password = "TestPricing2024!A"

    results: Dict[str, Any] = {
        "base_url": base_app_url,
        "desktop": {},
        "mobile": {},
        "a11y": {},
        "console_errors": [],
        "page_errors": [],
        "failed_responses": [],
        "redirect_test": {},
        "db_checks": {},
    }

    proc = subprocess.Popen(
        ["npx.cmd", "next", "start", "-p", str(desired_port)],
        cwd=str(Path.cwd()),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    try:
        ready_event = threading.Event()
        log_lines: List[str] = []

        def drain_logs():
            if not proc.stdout:
                return
            for line in proc.stdout:
                txt = line.rstrip("\n")
                log_lines.append(txt)
                if len(log_lines) > 400:
                    del log_lines[:50]
                if "ready" in txt.lower() or "started server" in txt.lower():
                    ready_event.set()

        t = threading.Thread(target=drain_logs, daemon=True)
        t.start()

        if not ready_event.wait(timeout=60):
            tail = log_lines[-30:]
            raise RuntimeError("production server not ready; last output: " + " | ".join(tail))
        for _ in range(30):
            try:
                response = requests.get(f"{base_app_url}/entrar", timeout=3, allow_redirects=False)
                if response.status_code in (200, 301, 302, 303, 307, 308):
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        else:
            raise RuntimeError("production server health check failed for /entrar")
        print("[ui] production server passed health check", flush=True)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            page.set_default_navigation_timeout(600000)

            console_errors: List[str] = []
            page_errors: List[str] = []
            failed_responses: List[Tuple[str, int]] = []

            def on_console(msg):
                if msg.type == "error":
                    console_errors.append(msg.text)

            def on_page_error(err):
                page_errors.append(str(err))

            def on_response(resp):
                try:
                    status = resp.status
                    if status >= 400:
                        failed_responses.append((resp.url, status))
                except Exception:
                    pass

            page.on("console", on_console)
            page.on("pageerror", on_page_error)
            page.on("response", on_response)

            def goto(path: str):
                print(f"[ui] goto {path}", flush=True)
                try:
                    page.goto(f"{base_app_url}{path}", wait_until="domcontentloaded")
                    page.wait_for_timeout(500)
                    consent = page.get_by_role("button", name=re.compile("aceitar cookies", re.I))
                    if consent.is_visible(timeout=1500):
                        consent.click()
                except Exception as e:
                    tail = " | ".join(log_lines[-30:])
                    raise RuntimeError(f"goto failed ({path}): {e} | server_tail: {tail}")

            def login():
                goto("/entrar")
                print("[ui] filling login", flush=True)
                email_input = page.locator("#email")
                email_input.fill(owner_email)
                pwd_input = page.locator("#password")
                pwd_input.fill(owner_password)
                page.get_by_role("button", name=re.compile("entrar|acessar|login", re.I)).click()
                try:
                    page.wait_for_url(re.compile(".*/(dashboard|simulador)"), timeout=30000)
                except PlaywrightTimeoutError:
                    page.wait_for_timeout(1500)
                print("[ui] login completed", flush=True)

            login()

            results["redirect_test"]["from"] = "/servicos/simulador"
            page.goto(f"{base_app_url}/servicos/simulador", wait_until="domcontentloaded")
            results["redirect_test"]["final_url"] = page.url

            goto("/simulador/novo")

            page.get_by_role("textbox", name=re.compile("^nome", re.I)).fill("Cenário teste UI")
            page.get_by_role("textbox", name=re.compile("descr", re.I)).fill("Teste automatizado (UI)")

            try:
                page.get_by_role("combobox", name=re.compile("servi", re.I)).click()
                page.get_by_role("option").first.click()
            except PlaywrightTimeoutError:
                pass

            page.get_by_role("button", name=re.compile("próximo|proximo|continuar", re.I)).click()
            page.wait_for_timeout(800)

            def fill_money(label_regex: str, value: str):
                loc = page.get_by_label(re.compile(label_regex, re.I))
                loc.fill(value)

            fill_money("horas estimadas", "10")
            fill_money("valor hora", "200")
            fill_money("despesas diretas", "1500")
            fill_money("despesas indiretas", "1000")

            page.get_by_role("button", name=re.compile("próximo|proximo|continuar", re.I)).click()
            page.wait_for_timeout(800)

            page.screenshot(path=str(artifact_dir / "desktop-step-after-parameters.png"), full_page=True)
            print("[ui] visible buttons:", page.get_by_role("button").all_inner_texts(), flush=True)

            confirm_button = page.get_by_role("button", name=re.compile("confirmar|salvar|criar", re.I))
            results["desktop"]["confirm_enabled_before"] = bool(confirm_button.is_enabled())

            post_requests: List[str] = []

            def on_request(req):
                if req.method.lower() == "post":
                    post_requests.append(req.url)

            page.on("request", on_request)

            confirm_button.click()
            try:
                results["desktop"]["confirm_disabled_after_click"] = not bool(confirm_button.is_enabled(timeout=1000))
            except PlaywrightTimeoutError:
                # A successful navigation detaches the button before it can be inspected.
                results["desktop"]["confirm_disabled_after_click"] = True

            start = time.time()
            while time.time() - start < 10 and not post_requests:
                time.sleep(0.05)

            context.set_offline(True)
            time.sleep(1.0)
            context.set_offline(False)

            try:
                page.wait_for_url(re.compile(".*/simulador/[0-9a-fA-F-]{36}$"), timeout=30000)
            except PlaywrightTimeoutError:
                confirm_button.click()
                page.wait_for_url(re.compile(".*/simulador/[0-9a-fA-F-]{36}$"), timeout=30000)

            scenario_url = page.url
            m = re.search(r"/simulador/([0-9a-fA-F-]{36})$", scenario_url)
            scenario_id = m.group(1) if m else None
            results["desktop"]["scenario_id"] = f"{abbrev(scenario_id)}…" if scenario_id else None
            results["desktop"]["final_url"] = scenario_url

            page.wait_for_timeout(800)
            try:
                page.get_by_role("link", name=re.compile("compar", re.I)).click(timeout=2000)
                page.wait_for_timeout(800)
                results["desktop"]["compare_opened"] = True
            except PlaywrightTimeoutError:
                results["desktop"]["compare_opened"] = False

            try:
                page.get_by_text(re.compile("Memória de Cálculo", re.I)).wait_for(timeout=2000)
                page.wait_for_timeout(800)
                results["desktop"]["memory_opened"] = True
            except PlaywrightTimeoutError:
                results["desktop"]["memory_opened"] = False

            # Reuse a seeded scenario with multiple versions to exercise the comparison route.
            comparable_id = "a82f3d95-8f64-46dc-96d5-19b823e193ce"
            try:
                page.goto(f"{base_app_url}/simulador/{comparable_id}/comparar", wait_until="domcontentloaded")
                page.wait_for_timeout(600)
                version_a = page.locator("#version-a")
                version_b = page.locator("#version-b")
                if version_a.count() and version_b.count() and version_a.locator("option").count() >= 2:
                    options = version_a.locator("option").all()
                    version_a.select_option(options[0].get_attribute("value"))
                    version_b.select_option(options[1].get_attribute("value"))
                    page.get_by_role("button", name=re.compile("^comparar$", re.I)).click()
                    page.get_by_text(re.compile("Parâmetros", re.I)).wait_for(timeout=5000)
                    results["desktop"]["comparison_existing_scenario"] = True
                else:
                    results["desktop"]["comparison_existing_scenario"] = False
            except Exception:
                results["desktop"]["comparison_existing_scenario"] = False

            results["desktop"]["horizontal_scroll"] = detect_horizontal_scroll(page)

            if scenario_id and supabase_url and service_role:
                versions = supabase_rest_get(
                    supabase_url,
                    service_role,
                    "pricing_scenario_versions",
                    f"pricing_scenario_id=eq.{scenario_id}",
                    "id,version_number",
                )
                items = supabase_rest_get(
                    supabase_url,
                    service_role,
                    "pricing_scenario_items",
                    f"scenario_version_id=in.({','.join([v['id'] for v in versions])})" if versions else "id=eq.00000000-0000-0000-0000-000000000000",
                    "id,scenario_version_id",
                )
                events = supabase_rest_get(
                    supabase_url,
                    service_role,
                    "pricing_scenario_events",
                    f"pricing_scenario_id=eq.{scenario_id}",
                    "id,event_type,version_id",
                )
                results["db_checks"] = {
                    "scenario_id": f"{abbrev(scenario_id)}…",
                    "versions_count": len(versions),
                    "versions": [f"{v['version_number']}:{abbrev(v['id'])}…" for v in sorted(versions, key=lambda x: x["version_number"])],
                    "items_count": len(items),
                    "events_total": len(events),
                    "version_created_events": len([e for e in events if e.get("event_type") == "version_created"]),
                }

            results["console_errors"] = [
                e for e in console_errors
                if e and "ERR_INTERNET_DISCONNECTED" not in e
            ]
            results["page_errors"] = [e for e in page_errors if e]
            results["failed_responses"] = [
                {"status": s, "url": u} for (u, s) in failed_responses if "chrome-error://" not in u
            ][:30]

            def test_viewport(name: str, width: int, height: int):
                ctx = browser.new_context(viewport={"width": width, "height": height})
                pg = ctx.new_page()
                pg.goto(f"{base_app_url}/simulador/novo", wait_until="domcontentloaded")
                pg.wait_for_timeout(600)
                mobile_scroll = bool(
                    pg.evaluate(
                        """() => {
                          const doc = document.documentElement;
                          const body = document.body;
                          const sw = Math.max(doc.scrollWidth, body.scrollWidth);
                          const cw = Math.max(doc.clientWidth, body.clientWidth);
                          return sw > cw + 2;
                        }"""
                    )
                )
                results["mobile"][name] = {
                    "viewport": f"{width}x{height}",
                    "horizontal_scroll": mobile_scroll,
                }
                ctx.close()

            test_viewport("375x812", 375, 812)
            test_viewport("390x844", 390, 844)
            test_viewport("768x1024", 768, 1024)

            goto("/simulador/novo")
            tabbed = []
            for _ in range(8):
                page.keyboard.press("Tab")
                active = page.evaluate(
                    "() => document.activeElement ? document.activeElement.tagName + '#' + (document.activeElement.id || '') : null"
                )
                tabbed.append(active)
            results["a11y"]["tab_sequence"] = tabbed
            try:
                page.keyboard.press("Escape")
                results["a11y"]["escape_pressed"] = True
            except Exception:
                results["a11y"]["escape_pressed"] = False

            browser.close()
    finally:
        try:
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            pass

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
