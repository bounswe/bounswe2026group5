from django.urls import path

from .views import (
    AdminUsersListAPIView,
    AuthMeAPIView,
    ForgotPasswordAPIView,
    LoginAPIView,
    LogoutAPIView,
    RegisterAPIView,
    ResetPasswordAPIView,
    TokenRefreshAPIView,
    UserAppUsageModeMeAPIView,
)

urlpatterns = [
    path("register/", RegisterAPIView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="token-refresh"),
    path("forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordAPIView.as_view(), name="reset-password"),
    path("admin/users/", AdminUsersListAPIView.as_view(), name="admin-users-list"),
    path("me/", AuthMeAPIView.as_view(), name="auth-me"),
    path("me/role/", UserAppUsageModeMeAPIView.as_view(), name="auth-me-role"),
]
