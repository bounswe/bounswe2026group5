# Generated manually to seed the admin user and profile from settings

from django.db import migrations
from django.conf import settings


from django.contrib.auth.hashers import make_password

def seed_admin_with_profile(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Profile = apps.get_model("profiles", "Profile")
    
    admin_email = getattr(settings, "ADMIN_EMAIL", "admin@test.com")
    admin_password = getattr(settings, "ADMIN_PASSWORD", "AdminPass123!")
    
    if not admin_email:
        return

    # Create or update the admin user
    user, created = User.objects.get_or_create(
        email=admin_email,
        defaults={
            "username": admin_email.split("@")[0],
            "role": "ADMIN",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
            "app_usage_mode": "ADMIN", # Admin usage mode
        }
    )
    
    if created:
        user.password = make_password(admin_password)
        user.save()
    elif user.role != "ADMIN":
        user.role = "ADMIN"
        user.save(update_fields=["role"])

    # Ensure profile exists
    if not Profile.objects.filter(user=user).exists():
        Profile.objects.create(
            user=user,
            username=user.username,
            display_name="System Admin",
            is_visible=False,
        )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0014_report"),
        ("profiles", "0016_profile_picture"),
    ]

    operations = [
        migrations.RunPython(seed_admin_with_profile, reverse_seed),
    ]
