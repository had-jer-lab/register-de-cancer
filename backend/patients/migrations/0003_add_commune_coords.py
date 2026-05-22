from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0002_cancertype_commune_habit_hospital_riskfactor_wilaya_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='commune',
            name='latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='commune',
            name='longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
