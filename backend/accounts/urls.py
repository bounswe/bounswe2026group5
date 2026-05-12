from django.urls import path

from .views import (
    AdminReportListAPIView,
    AdminReportUpdateAPIView,
    AdminUserUpdateAPIView,
    AdminUsersListAPIView,
    AuthMeAPIView,
    ForgotPasswordAPIView,
    GoogleOAuthLoginAPIView,
    LoginAPIView,
    LogoutAPIView,
    RegisterAPIView,
    ReportCreateAPIView,
    ResendVerificationAPIView,
    ResetPasswordAPIView,
    TokenRefreshAPIView,
    UserAppUsageModeMeAPIView,
    VerifyEmailAPIView,
)

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="token-refresh"),
    path("forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordAPIView.as_view(), name="reset-password"),
    path("verify-email/", VerifyEmailAPIView.as_view(), name="verify-email"),
    path(
        "resend-verification/",
        ResendVerificationAPIView.as_view(),
        name="resend-verification",
    ),
    path("admin/users/", AdminUsersListAPIView.as_view(), name="admin-users-list"),
    path(
        "admin/users/<uuid:user_id>/",
        AdminUserUpdateAPIView.as_view(),
        name="admin-user-update",
    ),
    path(
        "admin/reports/",
        AdminReportListAPIView.as_view(),
        name="admin-reports-list",
    ),
    path(
        "admin/reports/<uuid:report_id>/",
        AdminReportUpdateAPIView.as_view(),
        name="admin-report-update",
    ),
    path("reports/", ReportCreateAPIView.as_view(), name="report-create"),
    path("me/", AuthMeAPIView.as_view(), name="auth-me"),
    path("me/role/", UserAppUsageModeMeAPIView.as_view(), name="auth-me-role"),
    # OAuth2 providers
    path("google/", GoogleOAuthLoginAPIView.as_view(), name="google-oauth-login"),
]
