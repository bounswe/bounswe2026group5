# Generated manually

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0019_merge_0018_conflicts'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='audio',
            field=models.FileField(blank=True, help_text='User-uploaded profile audio (e.g. pronunciation).', null=True, upload_to='profile_audio/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='profile',
            name='linkedin_url',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='profile',
            name='video',
            field=models.FileField(blank=True, help_text='User-uploaded profile video intro.', null=True, upload_to='profile_video/%Y/%m/'),
        ),
    ]
