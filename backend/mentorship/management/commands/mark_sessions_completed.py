import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from mentorship.models import MeetingSession

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Finds all scheduled mentorship sessions whose end time has passed and marks them as completed."

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Query sessions that are currently SCHEDULED but have an end time in the past
        past_sessions = MeetingSession.objects.filter(
            status=MeetingSession.Status.SCHEDULED,
            scheduled_end_at_utc__lte=now,
        )

        count = past_sessions.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No past scheduled sessions found. Everything is up to date."))
            return

        self.stdout.write(f"Found {count} past scheduled session(s). Marking them as COMPLETED...")
        
        success_count = 0
        for session in past_sessions:
            try:
                # Update status and save individually to trigger post_save signals
                # (which generates the 'session_completed' timeline event)
                session.status = MeetingSession.Status.COMPLETED
                session.save(update_fields=["status", "updated_at"])
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to complete session {session.id}: {e}", exc_info=True)
                self.stderr.write(self.style.ERROR(f"Failed to update session {session.id}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Successfully marked {success_count} session(s) as COMPLETED."))
