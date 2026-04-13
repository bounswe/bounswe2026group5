"""Feed post views."""

from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Post
from .serializers import PostSerializer


class PostViewSet(viewsets.ModelViewSet):
    """
    list:   GET  /api/posts/         — public feed, newest first
    create: POST /api/posts/         — create post (auth required), multipart OK
    destroy: DELETE /api/posts/<id>/ — delete own post (auth required)
    """

    serializer_class = PostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Post.objects.select_related("author").all()

    def get_permissions(self):
        if self.action == "list":
            return []
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
        except Exception:
            raise PermissionDenied("User has no profile.")
        serializer.save(author=profile)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if post.author.user_id != request.user.pk:
            raise PermissionDenied("You can only delete your own posts.")
        post.image.delete(save=False)
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
