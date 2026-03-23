from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_state_transfer"),
        ("mentorship", "0001_state_transfer"),
        ("accounts", "0005_mentorshiprequest_match_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.DeleteModel(name="Match"),
                migrations.DeleteModel(name="MentorshipRequest"),
                migrations.DeleteModel(name="AvailabilitySlot"),
                migrations.DeleteModel(name="ProfileExpertise"),
                migrations.DeleteModel(name="ExpertiseField"),
                migrations.DeleteModel(name="Profile"),
            ],
        ),
    ]
