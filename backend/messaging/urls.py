"""URL routes for messaging app."""

from django.urls import path

from .views import (
    ConversationDetailAPIView,
    ConversationListAPIView,
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
        "messages/<uuid:message_id>/report/",
        MessageReportAPIView.as_view(),
        name="message-report",
    ),
]
