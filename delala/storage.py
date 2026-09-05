"""Media / static storage helpers for local disk vs Cloudflare R2 (S3 API)."""

from __future__ import annotations

import os
from typing import Any


def use_s3_media() -> bool:
    """True when production object storage is explicitly enabled and configured."""
    flag = (os.environ.get("DJANGO_USE_S3_MEDIA") or "").strip().lower()
    if flag in {"1", "true", "yes", "on"}:
        return True
    if flag in {"0", "false", "no", "off"}:
        return False
    # Auto-enable when the core R2/S3 env vars are present.
    bucket = (os.environ.get("AWS_STORAGE_BUCKET_NAME") or "").strip()
    endpoint = (os.environ.get("AWS_S3_ENDPOINT_URL") or "").strip()
    access = (os.environ.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret = (os.environ.get("AWS_SECRET_ACCESS_KEY") or "").strip()
    return bool(bucket and endpoint and access and secret)


def apply_s3_media_settings(settings_dict: dict[str, Any]) -> None:
    """
    Mutate a settings module namespace for django-storages + Cloudflare R2.

    Expects AWS_* env vars. Public URLs use AWS_S3_CUSTOM_DOMAIN when set
    (recommended R2 public bucket / custom domain).
    """
    bucket = (os.environ.get("AWS_STORAGE_BUCKET_NAME") or "").strip()
    endpoint = (os.environ.get("AWS_S3_ENDPOINT_URL") or "").strip()
    access = (os.environ.get("AWS_ACCESS_KEY_ID") or "").strip()
    secret = (os.environ.get("AWS_SECRET_ACCESS_KEY") or "").strip()
    region = (os.environ.get("AWS_S3_REGION_NAME") or "auto").strip() or "auto"
    custom_domain = (os.environ.get("AWS_S3_CUSTOM_DOMAIN") or "").strip()

    if not (bucket and endpoint and access and secret):
        raise ValueError(
            "S3/R2 media requires AWS_STORAGE_BUCKET_NAME, AWS_S3_ENDPOINT_URL, "
            "AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
        )

    settings_dict["AWS_ACCESS_KEY_ID"] = access
    settings_dict["AWS_SECRET_ACCESS_KEY"] = secret
    settings_dict["AWS_STORAGE_BUCKET_NAME"] = bucket
    settings_dict["AWS_S3_ENDPOINT_URL"] = endpoint
    settings_dict["AWS_S3_REGION_NAME"] = region
    settings_dict["AWS_S3_SIGNATURE_VERSION"] = "s3v4"
    settings_dict["AWS_DEFAULT_ACL"] = None
    settings_dict["AWS_QUERYSTRING_AUTH"] = False
    settings_dict["AWS_S3_FILE_OVERWRITE"] = False
    settings_dict["AWS_S3_OBJECT_PARAMETERS"] = {
        "CacheControl": "max-age=86400",
    }

    if custom_domain:
        # Host only or full URL — normalize to host for django-storages.
        domain = custom_domain
        if "://" in domain:
            domain = domain.split("://", 1)[1]
        domain = domain.rstrip("/")
        settings_dict["AWS_S3_CUSTOM_DOMAIN"] = domain
        settings_dict["MEDIA_URL"] = f"https://{domain}/"
    else:
        settings_dict["MEDIA_URL"] = f"{endpoint.rstrip('/')}/{bucket}/"

    settings_dict["STORAGES"] = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
