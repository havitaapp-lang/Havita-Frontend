"""Seeds the ISOLATED sandbox (havita_e2e_sandbox via backend :9097) only through the public API, with synthetic data.

Refuses to run against any other port. Never prints passwords or tokens. Writes the sandbox tenant id to sandbox.state.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

ENV_FILE = os.environ["SANDBOX_ENV_FILE"]  # credenciales sinteticas del sandbox (fuera del repositorio)
STATE_DIR = os.path.dirname(os.path.abspath(ENV_FILE))
BASE = os.environ.get("SANDBOX_API", "http://127.0.0.1:9097") + "/api/v1"
assert ":9094" not in BASE, "nunca contra el backend de la base local principal"
env = dict(l.strip().split("=", 1) for l in open(ENV_FILE) if "=" in l)
TAG = env["SBX_TAG"]
SUB = "e2esbx" + TAG


def call(method, path, body=None, token=None, tenant=None, host=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=None if body is None else json.dumps(body).encode())
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    if tenant: req.add_header("X-Tenant-ID", tenant)
    if host: req.add_header("Host", host)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def ok(res, what):
    status, body = res
    if status >= 300:
        print(f"FAILED {what}: HTTP {status} {str(body)[:300]}")
        sys.exit(1)
    return body.get("data", body)


def login(email, password):
    return ok(call("POST", "/auth/login", {"email": email, "password": password}), "login")["accessToken"]


sa = login(env["SBX_SA_EMAIL"], env["SBX_SA_PASSWORD"])
tenant = ok(call("POST", "/tenants", {
    "name": f"E2E Sandbox {TAG}", "slug": SUB, "subdomain": SUB, "city": "Cali", "address": "Sintetica 1",
    "phone": "3000000000", "contactEmail": env["SBX_ADMIN_EMAIL"], "adminName": f"E2E Admin {TAG}",
    "adminEmail": env["SBX_ADMIN_EMAIL"], "adminPassword": env["SBX_ADMIN_PASSWORD"], "adminPhone": "3000000000",
    "propertiesCount": 0}, token=sa), "create tenant")
tid = tenant["id"]
admin = login(env["SBX_ADMIN_EMAIL"], env["SBX_ADMIN_PASSWORD"])

units = {}
for number in ("E2E-SBX-101", "E2E-SBX-102", "E2E-SBX-103"):
    units[number] = ok(call("POST", "/properties", {"number": number, "name": "Apto " + number, "type": "Apartamento"},
                            token=admin, tenant=tid), "create property " + number)["id"]

inv = ok(call("POST", f"/properties/{units['E2E-SBX-101']}/resident-invitations", {"additionalPropertyIds": []},
              token=admin, tenant=tid), "invitation")
token = re.search(r"/register/invite/([^/?#]+)", inv.get("link") or inv.get("invitationLink") or json.dumps(inv)).group(1)
ok(call("POST", f"/public/resident-invitations/{token}/register", {
    "name": f"E2E Residente {TAG}", "email": env["SBX_RESIDENT_EMAIL"], "documentType": "CC",
    "documentId": "E2E" + TAG, "phone": "3000000001", "password": env["SBX_RESIDENT_PASSWORD"],
    "acceptTerms": True, "acceptPrivacy": True}, host=f"{SUB}.localhost:" + os.environ.get("SANDBOX_VITE_PORT", "5177")), "register resident")

ok(call("POST", "/staff", {
    "firstName": "E2E Porteria", "lastName": TAG, "documentNumber": "E2ESEC" + TAG, "position": "Guarda",
    "email": env["SBX_SECURITY_EMAIL"], "createSystemAccess": True, "loginEmail": env["SBX_SECURITY_EMAIL"],
    "password": env["SBX_SECURITY_PASSWORD"], "systemRole": "SECURITY"}, token=admin, tenant=tid), "create security")

for who in ("RESIDENT", "SECURITY"):
    login(env[f"SBX_{who}_EMAIL"], env[f"SBX_{who}_PASSWORD"])
VITE_HOST = f"{SUB}.localhost:" + os.environ.get("SANDBOX_VITE_PORT", "5177")


def register_invitation(invitation, name, email, password, document):
    """Completa una invitacion (propietario o arrendatario) con una cuenta sintetica; si la cuenta ya existe, la vincula."""
    raw = re.search(r"/register/invite/([^/?#]+)", invitation.get("link") or invitation.get("invitationLink") or json.dumps(invitation)).group(1)
    return ok(call("POST", f"/public/resident-invitations/{raw}/register", {
        "name": name, "email": email, "documentType": "CC", "documentId": document, "phone": "3000000002",
        "password": password, "acceptTerms": True, "acceptPrivacy": True}, host=VITE_HOST), "register " + name)


# Fase 2 (opcional, SANDBOX_PHASE2=1): datos sinteticos de las pruebas de tests/phase2 (selector de unidades, asambleas,
# delegacion y filtro por estructura). Requiere SBX_P2OWNER_EMAIL/PASSWORD y SBX_LESSEE_EMAIL/PASSWORD en el archivo de
# credenciales. El residente base (E2E-SBX-101) no cambia: las pruebas de una sola unidad siguen igual.
phase2 = os.environ.get("SANDBOX_PHASE2") == "1"
if phase2:
    # 1. Propietario sintetico de DOS unidades (E2E-SBX-102 y E2E-SBX-103) con la misma cuenta.
    for number in ("E2E-SBX-102", "E2E-SBX-103"):
        inv = ok(call("POST", f"/properties/{units[number]}/resident-invitations", {"additionalPropertyIds": []},
                      token=admin, tenant=tid), "invitation " + number)
        register_invitation(inv, f"E2E Propietario F2 {TAG}", env["SBX_P2OWNER_EMAIL"], env["SBX_P2OWNER_PASSWORD"], "E2EP" + TAG)
    # 2. Arrendatario sintetico de E2E-SBX-103, invitado por el propietario desde su portal.
    owner_token = login(env["SBX_P2OWNER_EMAIL"], env["SBX_P2OWNER_PASSWORD"])
    inv_lessee = ok(call("POST", "/resident/me/invitations", {"type": "Arrendatario", "email": env["SBX_LESSEE_EMAIL"],
                                                               "name": f"E2E Arrendatario {TAG}", "phone": "3000000003",
                                                               "propertyId": units["E2E-SBX-103"]},
                         token=owner_token, tenant=tid), "lessee invitation")
    register_invitation(inv_lessee, f"E2E Arrendatario {TAG}", env["SBX_LESSEE_EMAIL"], env["SBX_LESSEE_PASSWORD"], "E2EL" + TAG)
    login(env["SBX_LESSEE_EMAIL"], env["SBX_LESSEE_PASSWORD"])
    # 2b. Cierre E5 (D11-D13): unidad E2E-SBX-104 con DOS copropietarios sinteticos y un arrendatario invitado por el
    #     primero (requiere SBX_COOWNER1_*, SBX_COOWNER2_* y SBX_LESSEE2_*). Las demas unidades no cambian.
    units["E2E-SBX-104"] = ok(call("POST", "/properties", {"number": "E2E-SBX-104", "name": "Apto E2E-SBX-104", "type": "Apartamento"},
                                   token=admin, tenant=tid), "create property E2E-SBX-104")["id"]
    # La invitacion de propietario solo se genera con la unidad desocupada: se generan las dos y despues se registran.
    co_invitations = [ok(call("POST", f"/properties/{units['E2E-SBX-104']}/resident-invitations", {"additionalPropertyIds": []},
                              token=admin, tenant=tid), "invitation 104 " + who) for who in ("COOWNER1", "COOWNER2")]
    for i, (who, inv) in enumerate(zip(("COOWNER1", "COOWNER2"), co_invitations), start=1):
        register_invitation(inv, f"E2E Copropietario {i} {TAG}", env[f"SBX_{who}_EMAIL"], env[f"SBX_{who}_PASSWORD"], f"E2EC{i}" + TAG)
    co1_token = login(env["SBX_COOWNER1_EMAIL"], env["SBX_COOWNER1_PASSWORD"])
    inv_lessee2 = ok(call("POST", "/resident/me/invitations", {"type": "Arrendatario", "email": env["SBX_LESSEE2_EMAIL"],
                                                                "name": f"E2E Arrendatario 104 {TAG}", "phone": "3000000004",
                                                                "propertyId": units["E2E-SBX-104"]},
                          token=co1_token, tenant=tid), "lessee 104 invitation")
    register_invitation(inv_lessee2, f"E2E Arrendatario 104 {TAG}", env["SBX_LESSEE2_EMAIL"], env["SBX_LESSEE2_PASSWORD"], "E2EL2" + TAG)
    login(env["SBX_COOWNER2_EMAIL"], env["SBX_COOWNER2_PASSWORD"])
    # 3. Estructuras "Torre 1" y "Torre 10" (filtro por structureId: Torre 1 no incluye Torre 10), una unidad y un
    #    residente de censo en cada una. Las unidades E2E-SBX-* siguen sin estructura.
    for tower in ("Torre 1", "Torre 10"):
        compact = tower.replace(" ", "")
        s = ok(call("POST", "/properties/structures", {"name": tower, "type": "Torre", "totalLevels": 1}, token=admin, tenant=tid),
               "structure " + tower)
        p = ok(call("POST", "/properties", {"structureId": s["id"], "number": f"E2E-{compact}-101", "name": "Apto 101",
                                            "type": "Apartamento", "level": "Piso 1"}, token=admin, tenant=tid), "unit " + tower)
        ok(call("POST", "/residents", {"propertyId": p["id"], "name": "Residente " + tower, "type": "Propietario",
                                       "documentType": "CC", "documentId": "E2E" + compact,
                                       "email": f"e2e-{compact.lower()}-{TAG}@example.test", "phone": "3000000000"},
                token=admin, tenant=tid), "census resident " + tower)

open(os.path.join(STATE_DIR, "sandbox.state"), "w").write(f"SBX_TENANT={tid}\nSBX_SUBDOMAIN={SUB}\nSBX_PHASE2={'1' if phase2 else '0'}\n")
print(f"sandbox seeded: tenant {tid} subdomain {SUB}; units {len(units)}; admin, resident (owner of E2E-SBX-101) and security log in"
      + ("; phase 2: owner of E2E-SBX-102 and E2E-SBX-103 (lessee on 103), co-owners + lessee on E2E-SBX-104, towers Torre 1 / Torre 10"
         if phase2 else ""))
