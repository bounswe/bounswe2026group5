"""URL routes for messaging app."""

from django.urls import path

from .views import (
    ConversationDetailAPIView,
    ConversationListAPIView,
    MessageMarkReadAPIView,
    MessageReportAPIView,
)

urlpatterns = [
    path("conversations/", ConversationListAPIView.as_view(), name="message-conversation-list"),
    path(
        "conversations/<uuid:conversation_id>/",
        ConversationDetailAPIView.as_view(),
        name="message-conversation-detail",
    ),
    path(
        "<uuid:message_id>/report/",
        MessageReportAPIView.as_view(),
        name="message-report",
    ),
    path(
        "<uuid:message_id>/mark-read/",
        MessageMarkReadAPIView.as_view(),
        name="message-mark-read",
    ),
]
