import json
import os
import re
import socket
import subprocess
import threading
import time
import urllib.parse
import hashlib
import uuid
from pathlib import Path
from typing import Any

import requests
from playwright.sync_api import Browser, Page, sync_playwright


PREFIX = f"__pricing_v4_{int(time.time() * 1000)}"
OWNER_EMAIL = "owner-a@test-pricing.example.com"
OWNER_PASSWORD = "TestPricing2024!A"
ASSISTANT_EMAIL = "assistant-a@test-pricing.example.com"
ASSISTANT_PASSWORD = "TestPricing2024!A"
SENSITIVE_FIELDS = {
    "calculation_result", "calculation_memory", "parameters", "margin",
    "margin_bps", "margin_amount", "hourly_rate", "internal_cost", "cost",
    "tenant_id", "law_firm_id",
}


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in Path(".env.local").read_text(encoding="utf-8").splitlines():
        match = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line.strip())
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"').strip("'")
    return values


class Rest:
    def __init__(self, url: str, service_role: str):
        self.url = f"{url}/rest/v1"
        self.headers = {
            "apikey": service_role,
            "authorization": f"Bearer {service_role}",
            "content-type": "application/json",
            "prefer": "return=representation",
        }

    def request(self, method: str, table: str, query: str = "", body: Any = None) -> list[dict[str, Any]]:
        response = requests.request(
            method,
            f"{self.url}/{table}{'?' + query if query else ''}",
            headers=self.headers,
            data=json.dumps(body) if body is not None else None,
            timeout=30,
        )
        response.raise_for_status()
        return response.json() if response.content else []


def compact(value: str | None) -> str | None:
    return f"{value[:8]}..." if value else None


def create_distinct_fixture_version(env: dict[str, str], scenario_id: str) -> None:
    auth = requests.post(
        f"{env['NEXT_PUBLIC_SUPABASE_URL']}/auth/v1/token?grant_type=password",
        headers={"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "content-type": "application/json"},
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
        timeout=30,
    )
    auth.raise_for_status()
    access_token = auth.json()["access_token"]
    parameters = {
        "estimatedHours": 14, "hourlyRateCents": 25000, "percentageDiscountBps": 500,
        "entryAmountCents": 99750, "installmentCount": 6,
    }
    payload = {
        "p_scenario_id": scenario_id,
        "p_parameters": parameters,
        "p_calculation_result": {"totalAmountCents": 332500, "entryAmountCents": 99750, "financedAmountCents": 232750},
        "p_calculation_memory": {"steps": [{"step": "fixture", "description": "Versão B do roteiro", "value": 332500}]},
        "p_idempotency_key": f"pricing-v4-setup-{uuid.uuid4()}",
        "p_input_hash": hashlib.sha256(json.dumps(parameters, sort_keys=True).encode()).hexdigest(),
        "p_scenario_type": "main", "p_currency": "BRL", "p_total_amount_cents": 332500,
        "p_entry_amount_cents": 99750, "p_financed_amount_cents": 232750,
        "p_installment_count": 6, "p_success_fee_percentage_bps": 0,
        "p_activate": True, "p_items": [{"item_type": "fee", "description": "Honorários versão B", "quantity": 1, "unit_amount_cents": 332500, "total_amount_cents": 332500, "order_index": 0, "metadata": {}}],
    }
    response = requests.post(
        f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/create_pricing_scenario_version_idempotent",
        headers={"apikey": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "authorization": f"Bearer {access_token}", "content-type": "application/json"},
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    result = response.json()
    if not result.get("ok"):
        raise RuntimeError("fixture version RPC failed")


def has_horizontal_scroll(page: Page) -> bool:
    return bool(page.evaluate("""() => {
        const root = document.documentElement; const body = document.body;
        return Math.max(root.scrollWidth, body.scrollWidth) > Math.max(root.clientWidth, body.clientWidth) + 2;
    }"""))


def horizontal_overflow_details(page: Page) -> list[str]:
    return page.evaluate("""() => Array.from(document.querySelectorAll('*')).map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 100), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter((item) => item.right > window.innerWidth + 2).sort((a, b) => b.right - a.right).slice(0, 8).map((item) => `${item.tag}.${item.cls} right=${item.right} width=${item.width}`)""")


def dismiss_transient_overlays(page: Page) -> None:
    consent = page.get_by_role("button", name=re.compile("aceitar cookies", re.I))
    page.wait_for_timeout(500)
    if consent.count() > 0 and consent.first.is_visible():
        consent.click()


def login(page: Page, base_url: str, email: str, password: str) -> None:
    page.goto(f"{base_url}/entrar", wait_until="domcontentloaded")
    page.locator("#email").fill(email)
    page.locator("#password").fill(password)
    page.get_by_role("button", name=re.compile("entrar|acessar", re.I)).click()
    page.wait_for_url(re.compile(r".*/(dashboard|simulador|onboarding)(?:[/?].*)?$"), timeout=30000)
    dismiss_transient_overlays(page)
    if "/entrar" in page.url:
        raise RuntimeError("login did not leave /entrar")


def fill_wizard(page: Page, name: str) -> None:
    page.goto(page.url.split("/simulador")[0] + "/simulador/novo", wait_until="domcontentloaded")
    dismiss_transient_overlays(page)
    page.get_by_role("textbox", name=re.compile("^nome", re.I)).fill(name)
    page.get_by_role("textbox", name=re.compile("descr", re.I)).fill("Fixture funcional de regressão")
    page.get_by_role("button", name=re.compile("próximo|proximo", re.I)).click()
    page.get_by_label(re.compile("horas estimadas", re.I)).fill("10")
    page.get_by_label(re.compile("valor hora", re.I)).fill("300")
    page.get_by_label(re.compile("despesas diretas", re.I)).fill("500")
    page.get_by_label(re.compile("margem", re.I)).fill("2500")
    page.get_by_label(re.compile("entrada", re.I)).fill("100")
    page.get_by_label(re.compile("número de parcelas", re.I)).fill("3")
    page.get_by_label(re.compile("taxa de êxito", re.I)).fill("1000")
    page.get_by_role("button", name=re.compile("próximo|proximo", re.I)).click()


def save_result(artifact_dir: Path, results: dict[str, Any]) -> None:
    (artifact_dir / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


def cleanup_fixture_scenarios(prefix: str) -> dict[str, int]:
    script = r"""
const fs = require('fs');
const { Client } = require('pg');
const source = fs.readFileSync('scripts/debug_idempotency.mjs', 'utf8');
const match = source.match(/connectionString:\s*`([^`]+)`/);
if (!match) throw new Error('database cleanup connection is unavailable');
const client = new Client({ connectionString: match[1], ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  await client.query('BEGIN');
  try {
    const scenarios = await client.query('SELECT id FROM public.pricing_scenarios WHERE name LIKE $1', [process.argv[1] + '%']);
    const ids = scenarios.rows.map((row) => row.id);
    if (ids.length) {
      await client.query('SET LOCAL session_replication_role = replica');
      await client.query('DELETE FROM public.pricing_scenario_items WHERE scenario_version_id IN (SELECT id FROM public.pricing_scenario_versions WHERE pricing_scenario_id = ANY($1::uuid[]))', [ids]);
      await client.query('DELETE FROM public.pricing_idempotency_operations WHERE pricing_scenario_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM public.pricing_scenario_versions WHERE pricing_scenario_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM public.pricing_scenario_events WHERE pricing_scenario_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM public.pricing_scenarios WHERE id = ANY($1::uuid[])', [ids]);
    }
    await client.query('COMMIT');
    process.stdout.write(JSON.stringify({ removed: ids.length }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
"""
    completed = subprocess.run(
        ["node", "-e", script, prefix], capture_output=True, text=True, timeout=45,
    )
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip() or "database fixture cleanup failed")
    return json.loads(completed.stdout or "{}")


def main() -> None:
    env = load_env()
    rest = Rest(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    artifact_dir = Path("artifacts/pricing-final-v4")
    artifact_dir.mkdir(parents=True, exist_ok=True)
    port = 3100
    base_url = f"http://127.0.0.1:{port}"
    results: dict[str, Any] = {
        "fixture_prefix": PREFIX,
        "desktop": {}, "comparison": {}, "retry": {}, "archive_restore": {},
        "assistant": {}, "mobile": {}, "a11y": {}, "console": [], "network": [],
        "cleanup": {}, "server": {},
    }
    stale_cleanup = cleanup_fixture_scenarios("__pricing_v4_")
    results["cleanup"]["stale_fixture_scenarios_removed"] = stale_cleanup.get("removed", 0)
    created_ids: list[str] = []
    console_errors: list[str] = []
    page_errors: list[str] = []
    failures: list[dict[str, Any]] = []

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind(("127.0.0.1", port))
    except OSError as error:
        raise RuntimeError(f"port {port} is unavailable: {error}") from error
    finally:
        probe.close()

    proc = subprocess.Popen(
        ["npx.cmd", "next", "start", "-p", str(port)], cwd=str(Path.cwd()),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
    )
    results["server"]["pid"] = proc.pid
    logs: list[str] = []
    ready = threading.Event()

    def drain() -> None:
        if not proc.stdout:
            return
        for line in proc.stdout:
            logs.append(line.rstrip())
            if "ready" in line.lower() or "started server" in line.lower():
                ready.set()

    thread = threading.Thread(target=drain, daemon=True)
    thread.start()

    try:
        if not ready.wait(60):
            raise RuntimeError("next start did not become ready")
        health_error: Exception | None = None
        health = None
        for _ in range(4):
            try:
                health = requests.get(f"{base_url}/entrar", timeout=30)
                if health.status_code == 200:
                    break
            except requests.RequestException as error:
                health_error = error
            time.sleep(2)
        if health is None or health.status_code != 200:
            raise RuntimeError(f"health check failed: {health_error or health.status_code}")

        with sync_playwright() as playwright:
            browser: Browser = playwright.chromium.launch(headless=True)
            owner_context = browser.new_context(viewport={"width": 1440, "height": 1000})
            owner_page = owner_context.new_page()

            def attach(page: Page, scope: str) -> None:
                page.on("console", lambda message: console_errors.append(f"{scope}:{message.text}") if message.type == "error" and "ERR_FAILED" not in message.text else None)
                page.on("pageerror", lambda error: page_errors.append(f"{scope}:{error}"))
                page.on("response", lambda response: failures.append({"scope": scope, "status": response.status, "path": urllib.parse.urlparse(response.url).path}) if response.status >= 400 else None)

            attach(owner_page, "owner")
            login(owner_page, base_url, OWNER_EMAIL, OWNER_PASSWORD)
            owner_page.goto(f"{base_url}/servicos/simulador", wait_until="domcontentloaded")
            results["desktop"]["redirect"] = urllib.parse.urlparse(owner_page.url).path == "/simulador"

            # First version through the actual owner wizard and repeated click protection.
            fill_wizard(owner_page, f"{PREFIX}_owner")
            owner_page.screenshot(path=str(artifact_dir / "desktop-wizard.png"), full_page=True)
            save_button = owner_page.get_by_role("button", name=re.compile("criar cenário", re.I))
            results["desktop"]["save_enabled"] = save_button.is_enabled()
            dismiss_transient_overlays(owner_page)
            save_button.dblclick()
            owner_page.wait_for_url(re.compile(r".*/simulador/[0-9a-f-]{36}$"), timeout=30000)
            scenario_id = re.search(r"/simulador/([0-9a-f-]{36})$", owner_page.url).group(1)
            created_ids.append(scenario_id)
            results["desktop"]["scenario_id"] = compact(scenario_id)
            owner_page.wait_for_timeout(900)

            # The owner recalculates to create version two via the normal session.
            create_distinct_fixture_version(env, scenario_id)
            owner_page.reload(wait_until="domcontentloaded")
            version_rows = rest.request("GET", "pricing_scenario_versions", f"pricing_scenario_id=eq.{scenario_id}&select=id,version_number,total_amount_cents,entry_amount_cents,installment_count,success_fee_percentage_bps,monthly_fee_cents,calculation_memory")
            results["desktop"]["version_count_after_recalculate"] = len(version_rows)
            if len(version_rows) < 2:
                raise RuntimeError("recalculate did not create a second version")

            active_id = version_rows[-1]["id"]
            owner_page.reload(wait_until="domcontentloaded")
            results["desktop"]["memory_visible"] = (
                bool(active_id)
                and owner_page.get_by_text(re.compile("Memória de Cálculo", re.I)).count() > 0
                and bool(version_rows[-1]["calculation_memory"])
            )
            owner_page.screenshot(path=str(artifact_dir / "desktop-memory.png"), full_page=True)

            # Activate v1, then compare v1 against v2 and persist selection in the URL.
            first_id = version_rows[0]["id"]
            if first_id != active_id:
                owner_page.get_by_role("button", name=re.compile("^ativar$", re.I)).first.click()
                owner_page.wait_for_timeout(900)
            owner_page.get_by_role("link", name=re.compile("comparar versões", re.I)).click()
            owner_page.wait_for_timeout(500)
            owner_page.locator("#version-a").select_option(first_id)
            owner_page.locator("#version-b").select_option(active_id)
            owner_page.get_by_role("button", name=re.compile("^comparar$", re.I)).click()
            owner_page.get_by_text(re.compile("Parâmetros", re.I)).wait_for(timeout=10000)
            owner_page.wait_for_url(re.compile(r".*[?&]a=[0-9a-f-]{36}.*[?&]b=[0-9a-f-]{36}"), timeout=10000)
            comparison_url = owner_page.url
            owner_page.reload(wait_until="domcontentloaded")
            results["comparison"] = {
                "desktop": True,
                "url_has_versions": "a=" in comparison_url and "b=" in comparison_url,
                "parameters": owner_page.get_by_text(re.compile("Parâmetros", re.I)).count() > 0,
                "results": owner_page.get_by_text(re.compile("Resultados", re.I)).count() > 0,
                "differences": any(row["total_amount_cents"] != version_rows[0]["total_amount_cents"] for row in version_rows[1:]),
                "reload_preserved": owner_page.locator("#version-a").input_value() == first_id and owner_page.locator("#version-b").input_value() == active_id,
                "no_nan_or_undefined": "nan" not in owner_page.locator("main").inner_text().lower() and "undefined" not in owner_page.locator("main").inner_text().lower(),
            }
            owner_page.screenshot(path=str(artifact_dir / "desktop-comparison.png"), full_page=True)

            # Archive and restore using confirmation dialogs and normal owner session.
            owner_page.goto(f"{base_url}/simulador/{scenario_id}", wait_until="domcontentloaded")
            owner_page.get_by_role("button", name=re.compile("^arquivar$", re.I)).click()
            owner_page.get_by_role("dialog").get_by_role("button", name=re.compile("^arquivar$", re.I)).click()
            owner_page.wait_for_url(re.compile(r".*/simulador$"), timeout=10000)
            archived = rest.request("GET", "pricing_scenarios", f"id=eq.{scenario_id}&select=status,archived_at,active_version_id")
            owner_page.goto(f"{base_url}/simulador/{scenario_id}", wait_until="domcontentloaded")
            results["archive_restore"]["archived"] = archived[0]["status"] == "archived"
            results["archive_restore"]["read_only"] = owner_page.get_by_role("button", name=re.compile("recalcular|duplicar", re.I)).count() == 0
            owner_page.screenshot(path=str(artifact_dir / "desktop-archived.png"), full_page=True)
            owner_page.get_by_role("button", name=re.compile("^restaurar$", re.I)).click()
            owner_page.get_by_role("dialog").get_by_role("button", name=re.compile("^restaurar$", re.I)).click()
            owner_page.wait_for_timeout(1000)
            restored = rest.request("GET", "pricing_scenarios", f"id=eq.{scenario_id}&select=status,archived_at,active_version_id")
            restored_versions = rest.request("GET", "pricing_scenario_versions", f"pricing_scenario_id=eq.{scenario_id}&select=id")
            event_rows = rest.request("GET", "pricing_scenario_events", f"pricing_scenario_id=eq.{scenario_id}&select=event_type")
            results["archive_restore"].update({
                "restored": restored[0]["status"] != "archived" and restored[0]["archived_at"] is None,
                "versions_preserved": len(restored_versions) == len(version_rows),
                "active_preserved": restored[0]["active_version_id"] == first_id,
                "events": sorted({row["event_type"] for row in event_rows if row["event_type"] in {"scenario_archived", "scenario_restored"}}),
            })
            owner_page.screenshot(path=str(artifact_dir / "desktop-restored.png"), full_page=True)

            # Simulate a response lost after the calculation action was processed.
            # The retry must reuse the browser-held idempotency key and produce one version only.
            retry_route_state = {"armed": False, "post_count": 0, "response_dropped": False}

            def drop_processed_calculation(route) -> None:
                request = route.request
                if not retry_route_state["armed"] or request.method != "POST":
                    route.continue_()
                    return
                retry_route_state["post_count"] += 1
                if retry_route_state["post_count"] == 2 and not retry_route_state["response_dropped"]:
                    retry_route_state["response_dropped"] = True
                    route.fetch()
                    route.abort("failed")
                    return
                route.continue_()

            owner_page.route("**/simulador/novo", drop_processed_calculation)
            fill_wizard(owner_page, f"{PREFIX}_retry")
            retry_button = owner_page.get_by_role("button", name=re.compile("criar cenário", re.I))
            retry_route_state["armed"] = True
            dismiss_transient_overlays(owner_page)
            retry_button.click()
            owner_page.wait_for_timeout(2200)
            if not retry_route_state["response_dropped"]:
                raise RuntimeError("retry harness did not intercept the calculation Server Action response")
            if "/simulador/novo" not in owner_page.url:
                raise RuntimeError("lost-response simulation unexpectedly completed the wizard")
            retry_button.click()
            owner_page.wait_for_url(re.compile(r".*/simulador/[0-9a-f-]{36}$"), timeout=30000)
            retry_scenario_id = re.search(r"/simulador/([0-9a-f-]{36})$", owner_page.url).group(1)
            created_ids.append(retry_scenario_id)
            retry_versions = rest.request(
                "GET", "pricing_scenario_versions",
                f"pricing_scenario_id=eq.{retry_scenario_id}&select=id,version_number",
            )
            retry_items = rest.request(
                "GET", "pricing_scenario_items",
                f"scenario_version_id=in.({','.join(row['id'] for row in retry_versions)})&select=id",
            )
            retry_events = rest.request(
                "GET", "pricing_scenario_events",
                f"pricing_scenario_id=eq.{retry_scenario_id}&select=event_type",
            )
            retry_idempotency = rest.request(
                "GET", "pricing_idempotency_operations",
                f"pricing_scenario_id=eq.{retry_scenario_id}&operation_type=eq.create_version&select=idempotency_key,status,result_version_id",
            )
            results["retry"] = {
                "response_dropped_after_processing": retry_route_state["response_dropped"],
                "post_requests": retry_route_state["post_count"],
                "scenario_id": compact(retry_scenario_id),
                "version_count": len(retry_versions),
                "item_count": len(retry_items),
                "version_created_events": sum(1 for row in retry_events if row["event_type"] == "version_created"),
                "idempotency": [{
                    "key": compact(row["idempotency_key"]),
                    "status": row["status"],
                    "result_version_id": compact(row["result_version_id"]),
                } for row in retry_idempotency],
            }
            if len(retry_versions) != 1 or len(retry_items) != 1 or results["retry"]["version_created_events"] != 1:
                raise RuntimeError("retry created duplicate pricing records")
            if len(retry_idempotency) != 1 or retry_idempotency[0]["status"] != "completed" or retry_idempotency[0]["result_version_id"] != retry_versions[0]["id"]:
                raise RuntimeError("retry idempotency record is inconsistent")
            owner_page.unroute("**/simulador/novo", drop_processed_calculation)

            # Assistant session: route access, controls, page content and response field names.
            assistant_context = browser.new_context(viewport={"width": 1280, "height": 900})
            assistant_page = assistant_context.new_page()
            assistant_response_fields: set[str] = set()
            attach(assistant_page, "assistant")

            def inspect_response(response) -> None:
                if "/simulador" not in response.url or response.status >= 400:
                    return
                try:
                    body = response.text().lower()
                    for field in SENSITIVE_FIELDS:
                        if field in body:
                            assistant_response_fields.add(field)
                except Exception:
                    pass

            assistant_page.on("response", inspect_response)
            login(assistant_page, base_url, ASSISTANT_EMAIL, ASSISTANT_PASSWORD)
            assistant_page.goto(f"{base_url}/simulador", wait_until="domcontentloaded")
            assistant_page.wait_for_timeout(2500)
            assistant_listing = assistant_page.content().lower()
            assistant_page.goto(f"{base_url}/simulador/{scenario_id}", wait_until="domcontentloaded")
            assistant_page.wait_for_timeout(2500)
            assistant_detail = assistant_page.content().lower()
            assistant_page.screenshot(path=str(artifact_dir / "assistant-detail.png"), full_page=True)
            direct_urls: dict[str, str] = {}
            for label, path in {
                "new": "/simulador/novo",
                "compare": f"/simulador/{scenario_id}/comparar",
                "other_tenant": "/simulador/00000000-0000-0000-0000-000000000000",
            }.items():
                assistant_page.goto(f"{base_url}{path}", wait_until="domcontentloaded")
                assistant_page.wait_for_timeout(2500)
                direct_urls[label] = urllib.parse.urlparse(assistant_page.url).path
            results["assistant"] = {
                "new_hidden": "novo cenário" not in assistant_listing,
                "actions_hidden": all(label not in assistant_detail for label in ["recalcular", "duplicar", "arquivar", "restaurar", "ativar"]),
                "memory_blocked": "visível apenas para o proprietário" in assistant_detail,
                "sensitive_response_fields": sorted(assistant_response_fields),
                "direct_urls": direct_urls,
            }
            assistant_context.close()

            # Basic keyboard checks and mobile visual/navigation checks.
            owner_page.goto(f"{base_url}/simulador/{scenario_id}", wait_until="domcontentloaded")
            owner_page.wait_for_timeout(1000)
            focusable: list[str] = []
            for _ in range(10):
                owner_page.keyboard.press("Tab")
                focusable.append(owner_page.evaluate("() => document.activeElement?.tagName + '#' + (document.activeElement?.id || '')"))
            owner_page.get_by_role("button", name=re.compile("^arquivar$", re.I)).click()
            owner_page.get_by_role("dialog").wait_for(timeout=3000)
            owner_page.keyboard.press("Escape")
            owner_page.wait_for_timeout(500)
            dialog_escape_closed = not owner_page.get_by_role("dialog").is_visible()
            owner_page.goto(f"{base_url}/simulador", wait_until="domcontentloaded")
            results["a11y"] = {
                "tab_targets": focusable,
                "dialog_escape_closed": dialog_escape_closed,
                "labels": all(owner_page.get_by_label(label).count() > 0 for label in ["Buscar cenários"]),
            }

            for name, width, height in [("375x812", 375, 812), ("390x844", 390, 844), ("768x1024", 768, 1024)]:
                mobile_context = browser.new_context(viewport={"width": width, "height": height})
                mobile_page = mobile_context.new_page()
                attach(mobile_page, f"mobile-{name}")
                login(mobile_page, base_url, OWNER_EMAIL, OWNER_PASSWORD)
                mobile_page.goto(f"{base_url}/simulador/{scenario_id}", wait_until="domcontentloaded")
                detail_scroll = has_horizontal_scroll(mobile_page)
                detail_overflow = horizontal_overflow_details(mobile_page)
                detail_dimensions = mobile_page.evaluate("() => ({ innerWidth: window.innerWidth, documentScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth })")
                mobile_page.goto(f"{base_url}/simulador/{scenario_id}/comparar?a={first_id}&b={active_id}", wait_until="domcontentloaded")
                comparison_scroll = has_horizontal_scroll(mobile_page)
                comparison_overflow = horizontal_overflow_details(mobile_page)
                if name == "375x812":
                    mobile_page.screenshot(path=str(artifact_dir / "mobile-375-comparison.png"), full_page=True)
                results["mobile"][name] = {
                    "detail_horizontal_scroll": detail_scroll,
                    "comparison_horizontal_scroll": comparison_scroll,
                    "detail_dimensions": detail_dimensions,
                    "detail_overflow": detail_overflow,
                    "comparison_overflow": comparison_overflow,
                    "comparison_visible": mobile_page.get_by_text(re.compile("Versão A", re.I)).count() > 0,
                    "comparison_dimensions": mobile_page.evaluate("() => ({ innerWidth: window.innerWidth, documentScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth })"),
                }
                mobile_context.close()

            browser.close()

        results["console"] = {"errors": console_errors, "page_errors": page_errors}
        results["network"] = {"unexpected_statuses": failures}
        if console_errors or page_errors or failures:
            raise RuntimeError("critical console, page, or network errors were captured")
    finally:
        try:
            cleanup_result = cleanup_fixture_scenarios("__pricing_v4_")
            remaining = rest.request("GET", "pricing_scenarios", "name=like.__pricing_v4_*&select=id")
            results["cleanup"] = {
                "removed_fixture_scenarios": cleanup_result.get("removed", 0),
                "remaining_fixture_scenarios": len(remaining),
            }
        except Exception as cleanup_error:
            results["cleanup"] = {"error": str(cleanup_error)}
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        results["server"]["port_released"] = not socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect_ex(("127.0.0.1", port)) == 0
        save_result(artifact_dir, results)


if __name__ == "__main__":
    main()
