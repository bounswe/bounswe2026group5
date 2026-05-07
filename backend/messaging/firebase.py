import logging, firebase_admin
from django.conf import settings
from firebase_admin import credentials, firestore

_app, _db = None, None

def get_firebase_app():
    global _app
    if not _app:
        p = settings.BASE_DIR / settings.FIREBASE_SERVICE_ACCOUNT_PATH
        if not p.exists(): return None
        for a in firebase_admin._apps.values():
            if a.name == "messaging": _app = a; return _app
        _app = firebase_admin.initialize_app(credentials.Certificate(str(p)), name="messaging")
    return _app

def get_firestore_client():
    global _db
    if not _db:
        a = get_firebase_app()
        if not a: return None
        i = getattr(settings, "FIRESTORE_DATABASE_ID", "neighborship-messaging")
        _db = firestore.client(a, database_id=i)
    return _db

def is_firebase_available(): return get_firestore_client() is not None

def sync_message_to_firestore(m):
    try:
        c = get_firestore_client()
        if not c: return False
        d = {"id": str(m.id), "sender_id": str(m.sender_id), "sender_username": m.sender.username,
             "sender_display_name": m.sender.display_name, "sender_picture_url": m.sender.picture_url,
             "body": m.body, "attachment_url": m.attachment.url if m.attachment else None,
             "created_at": m.created_at.isoformat(), "read_receipts": {}}
        c.collection("conversations").document(str(m.conversation_id)).collection("messages").document(str(m.id)).set(d, merge=True)
        return True
    except: return False

def update_message_read_status_in_firestore(message_id, conversation_id, user_id, status):
    try:
        c = get_firestore_client()
        if not c: return False
        c.collection("conversations").document(str(conversation_id)).collection("messages").document(str(message_id)).update({f"read_receipts.{user_id}": status})
        return True
    except: return False

def delete_conversation_from_firestore(conversation_id):
    try:
        c = get_firestore_client()
        if not c: return False
        r = c.collection("conversations").document(str(conversation_id))
        for m in r.collection("messages").stream(): m.reference.delete()
        r.delete(); return True
    except: return False
