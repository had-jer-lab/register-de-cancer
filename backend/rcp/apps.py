from django.apps import AppConfig


class RcpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rcp'
    verbose_name = 'Réunions RCP'

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(self._start_scheduler, sender=self)

    def _start_scheduler(self, **kwargs):
        try:
            from . import scheduler
            scheduler.start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Scheduler error: {e}")