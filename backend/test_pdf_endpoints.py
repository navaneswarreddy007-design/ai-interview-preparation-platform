import os
import requests
import io
import pypdf

port = os.environ.get("PORT", "5001")
BASE_URL = f"http://127.0.0.1:{port}/api"

def test_endpoints():
    print("=" * 60)
    print("TESTING PREPFORGE PDF DOWNLOAD & EXPORT API ENDPOINTS")
    print("=" * 60)

    # 1. Get recent sessions
    print("\n[Step 1] Fetching recent session from /api/history...")
    r = requests.get(f"{BASE_URL}/history", timeout=5)
    assert r.status_code == 200
    sessions = r.json()["sessions"]
    assert len(sessions) > 0, "No sessions found in history"
    session_id = sessions[0]["id"]
    candidate_name = sessions[0]["candidate_name"]
    print(f"  -> Testing with session ID: {session_id} ({candidate_name})")

    # 2. Test GET /api/history/<session_id>/pdf
    print("\n[Step 2] Testing GET /api/history/<session_id>/pdf...")
    pdf_resp = requests.get(f"{BASE_URL}/history/{session_id}/pdf", timeout=10)
    assert pdf_resp.status_code == 200, f"Expected 200, got {pdf_resp.status_code}: {pdf_resp.text}"
    assert "application/pdf" in pdf_resp.headers.get("Content-Type", ""), "Response is not application/pdf"
    assert "attachment" in pdf_resp.headers.get("Content-Disposition", ""), "Missing attachment header"
    print(f"  -> HTTP 200 OK! Content-Type: {pdf_resp.headers['Content-Type']}")
    print(f"  -> Content-Disposition: {pdf_resp.headers['Content-Disposition']}")
    print(f"  -> Binary PDF Size: {len(pdf_resp.content)} bytes")

    # Verify PDF content with pypdf
    reader = pypdf.PdfReader(io.BytesIO(pdf_resp.content))
    assert len(reader.pages) >= 1
    extracted_text = "\n".join([p.extract_text() for p in reader.pages])
    assert "PREPFORGE" in extracted_text
    assert "CANDIDATE PERFORMANCE REPORT" in extracted_text
    print(f"  -> Successfully extracted text from {len(reader.pages)} pages in downloaded PDF.")

    # 3. Test POST /api/export-pdf
    print("\n[Step 3] Testing POST /api/export-pdf with session payload...")
    # Get full session details
    detail_resp = requests.get(f"{BASE_URL}/history/{session_id}", timeout=5)
    assert detail_resp.status_code == 200
    session_payload = detail_resp.json()["session"]

    post_resp = requests.post(f"{BASE_URL}/export-pdf", json={"session": session_payload}, timeout=10)
    assert post_resp.status_code == 200, f"Expected 200, got {post_resp.status_code}: {post_resp.text}"
    assert "application/pdf" in post_resp.headers.get("Content-Type", "")
    print(f"  -> POST /api/export-pdf returned HTTP 200 OK! Size: {len(post_resp.content)} bytes")

    reader2 = pypdf.PdfReader(io.BytesIO(post_resp.content))
    assert len(reader2.pages) >= 1
    print(f"  -> Successfully verified exported PDF pages ({len(reader2.pages)} pages).")

    # 4. Test error handling on invalid session ID
    print("\n[Step 4] Testing error handling with non-existent session ID...")
    err_resp = requests.get(f"{BASE_URL}/history/non-existent-uuid-12345/pdf", timeout=5)
    assert err_resp.status_code == 404
    print(f"  -> Correctly returned 404 Not Found for non-existent session.")

    print("\n" + "=" * 60)
    print("ALL PDF ENDPOINT TESTS PASSED SUCCESSFULLY 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_endpoints()
