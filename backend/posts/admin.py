from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["id", "author", "content", "created_at"]
    list_select_related = ["author"]
    ordering = ["-created_at"]
