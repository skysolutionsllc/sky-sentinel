"""CMS data API client — fetches real DME supplier and Part B data."""
import httpx
from backend.config import CMS_API_BASE, CMS_DATASETS


def fetch_dme_suppliers(limit: int = 500, offset: int = 0) -> list:
    """Fetch DME supplier utilization data from CMS API.

    Dataset: Medicare DME Devices & Supplies — by Supplier
    Fields: NPI, provider name, state, entity type, HCPCS, utilization, payments
    """
    dataset_id = CMS_DATASETS["dme_by_supplier"]
    url = f"{CMS_API_BASE}/{dataset_id}/data"

    params = {
        "size": limit,
        "offset": offset,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            print(f"[CMS API] Fetched {len(data)} DME supplier records")
            return data
    except Exception as e:
        print(f"[CMS API] Error fetching DME data: {e}")
        return []


def fetch_part_b_summary(limit: int = 200, offset: int = 0) -> list:
    """Fetch Part B provider summary for peer baselines."""
    dataset_id = CMS_DATASETS["part_b_summary"]
    url = f"{CMS_API_BASE}/{dataset_id}/data"

    params = {
        "size": limit,
        "offset": offset,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            print(f"[CMS API] Fetched {len(data)} Part B summary records")
            return data
    except Exception as e:
        print(f"[CMS API] Error fetching Part B data: {e}")
        return []


def map_cms_supplier(raw: dict) -> dict:
    """Map CMS API field names to our Supplier model."""
    return {
        "npi": raw.get("Suplr_NPI", ""),
        "name": raw.get("Suplr_Prvdr_Last_Name_Org", "Unknown"),
        "entity_type": raw.get("Suplr_Prvdr_Ent_Cd", "O"),
        "state": raw.get("Suplr_Prvdr_State_Abrvtn", "XX"),
        "city": raw.get("Suplr_Prvdr_City", ""),
        "zip_code": raw.get("Suplr_Prvdr_Zip5", ""),
        "specialty": raw.get("Suplr_Prvdr_Spclty_Desc", "DME Supplier"),
        "total_services": _safe_float(raw.get("Tot_Suplr_Srvcs")),
        "total_billed": _safe_float(raw.get("Suplr_Sbmtd_Chrgs")),
        "total_allowed": _safe_float(raw.get("Suplr_Mdcr_Alowd_Amt")),
        "total_paid": _safe_float(raw.get("Suplr_Mdcr_Pymt_Amt")),
        "beneficiary_count": _safe_int(raw.get("Tot_Suplr_Benes")),
        "total_claims": _safe_int(raw.get("Tot_Suplr_Clms")),
        "unique_hcpcs": _safe_int(raw.get("Tot_Suplr_HCPCS_Cds")),
    }


def _safe_float(val) -> float:
    try:
        return float(val) if val is not None else 0.0
    except (ValueError, TypeError):
        return 0.0


def _safe_int(val) -> int:
    try:
        return int(float(val)) if val is not None else 0
    except (ValueError, TypeError):
        return 0
