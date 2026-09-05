from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from delala.firebase import FirebaseAuthError
from properties.models import (
    Conversation,
    Message,
    Notification,
    Profile,
    Property,
    PropertyRequest,
)


class MessagingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            username="owner1",
            email="owner1@gmail.com",
            password="pass12345",
            first_name="Owner",
            last_name="One",
        )
        Profile.objects.create(
            user=self.owner,
            user_type="owner",
            phone_no="0911000001",
        )

        self.customer = User.objects.create_user(
            username="customer1",
            email="customer1@gmail.com",
            password="pass12345",
            first_name="Customer",
            last_name="One",
        )
        Profile.objects.create(
            user=self.customer,
            user_type="customer",
            phone_no="0911000002",
        )

        self.stranger = User.objects.create_user(
            username="stranger1",
            email="stranger1@gmail.com",
            password="pass12345",
        )
        Profile.objects.create(
            user=self.stranger,
            user_type="customer",
            phone_no="0911000003",
        )

        self.property = Property.objects.create(
            owner=self.owner,
            title="Piassa Flat",
            description="Bright apartment",
            property_type="apartment",
            location="Piassa",
            price="25000.00",
            status="rent",
        )
        self.property_request = PropertyRequest.objects.create(
            property=self.property,
            customer=self.customer,
            status=PropertyRequest.STATUS_ACCEPTED,
        )

    def _open_conversation(self, user=None):
        self.client.force_login(user or self.customer)
        return self.client.post(
            "/api/messages/conversations/",
            {"property_request_id": self.property_request.id},
            format="json",
        )

    def test_unauthenticated_cannot_list_conversations(self):
        response = self.client.get("/api/messages/conversations/")
        self.assertEqual(response.status_code, 403)

    def test_pending_request_cannot_open_conversation(self):
        self.property_request.status = PropertyRequest.STATUS_PENDING
        self.property_request.save(update_fields=["status", "updated_at"])
        response = self._open_conversation()
        self.assertEqual(response.status_code, 400)

    def test_declined_request_cannot_open_conversation(self):
        self.property_request.status = PropertyRequest.STATUS_DECLINED
        self.property_request.save(update_fields=["status", "updated_at"])
        response = self._open_conversation()
        self.assertEqual(response.status_code, 400)

    def test_participant_can_open_and_list_conversation(self):
        create = self._open_conversation()
        self.assertEqual(create.status_code, 201)
        self.assertTrue(create.data["created"])
        conversation_id = create.data["id"]

        listed = self.client.get("/api/messages/conversations/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["id"], conversation_id)

    def test_opening_existing_conversation_does_not_duplicate(self):
        first = self._open_conversation()
        second = self._open_conversation()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.data["created"])
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_non_participant_cannot_open_conversation(self):
        response = self._open_conversation(self.stranger)
        self.assertEqual(response.status_code, 400)

    def test_non_participant_cannot_access_conversation(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.stranger)
        response = self.client.get(
            f"/api/messages/conversations/{conversation.id}/"
        )
        self.assertEqual(response.status_code, 404)

    def test_declined_blocks_existing_conversation_access(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.property_request.status = PropertyRequest.STATUS_DECLINED
        self.property_request.save(update_fields=["status", "updated_at"])

        self.client.force_login(self.customer)
        detail = self.client.get(
            f"/api/messages/conversations/{conversation.id}/"
        )
        self.assertEqual(detail.status_code, 403)

        send = self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "Hello"},
            format="json",
        )
        self.assertEqual(send.status_code, 403)

    def test_participant_can_send_message_sender_is_authenticated_user(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.customer)
        response = self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "Is this still available?"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sender_id"], self.customer.id)
        self.assertEqual(response.data["body"], "Is this still available?")

    def test_non_participant_cannot_send_message(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.stranger)
        response = self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(Message.objects.count(), 0)

    def test_empty_message_rejected(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.customer)
        response = self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_client_cannot_spoof_sender(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.customer)
        response = self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "Hi", "sender": self.owner.id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sender_id"], self.customer.id)

    def test_unread_and_mark_read(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.customer,
            body="Hello owner",
        )

        self.client.force_login(self.owner)
        listed = self.client.get("/api/messages/conversations/")
        self.assertEqual(listed.data[0]["unread_count"], 1)

        read = self.client.post(
            f"/api/messages/conversations/{conversation.id}/read/"
        )
        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.data["updated"], 1)
        self.assertEqual(read.data["unread_count"], 0)

    def test_new_message_notifies_recipient_only(self):
        conversation = Conversation.objects.create(
            property=self.property,
            customer=self.customer,
            owner=self.owner,
            property_request=self.property_request,
        )
        self.client.force_login(self.customer)
        self.client.post(
            f"/api/messages/conversations/{conversation.id}/messages/",
            {"body": "Interested in viewing"},
            format="json",
        )
        self.assertEqual(
            Notification.objects.filter(recipient=self.owner).count(),
            1,
        )
        self.assertEqual(
            Notification.objects.filter(recipient=self.customer).count(),
            0,
        )
        note = Notification.objects.get(recipient=self.owner)
        self.assertEqual(note.title, "New message")
        self.assertIn(f"c={conversation.id}", note.link)

    def test_property_request_flow_still_works(self):
        self.client.force_login(self.customer)
        response = self.client.get("/api/requests/mine/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.property_request.id)


class FirebaseSessionExchangeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="fb_owner",
            email="fb_owner@gmail.com",
            password="pass12345",
            first_name="Fb",
            last_name="Owner",
        )
        self.owner_profile = Profile.objects.create(
            user=self.owner,
            user_type="owner",
            phone_no="0911222001",
        )
        self.customer = User.objects.create_user(
            username="fb_customer",
            email="fb_customer@gmail.com",
            password="pass12345",
            first_name="Fb",
            last_name="Customer",
        )
        self.customer_profile = Profile.objects.create(
            user=self.customer,
            user_type="customer",
            phone_no="0911222002",
        )

    def _exchange(self, payload):
        return self.client.post("/api/auth/firebase/", payload, format="json")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_links_existing_user_by_firebase_uid(self, mock_verify):
        self.owner_profile.firebase_uid = "uid-owner-1"
        self.owner_profile.save(update_fields=["firebase_uid"])
        mock_verify.return_value = {
            "uid": "uid-owner-1",
            "email": "other@gmail.com",
            "email_verified": False,
            "aud": "test-project",
        }

        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["id"], self.owner.id)
        self.assertEqual(response.data["user"]["user_type"], "owner")
        self.assertEqual(response.data["redirect"], "/owner")

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["user"]["id"], self.owner.id)

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_links_existing_user_by_verified_email_without_duplicate(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-customer-new",
            "email": "fb_customer@gmail.com",
            "email_verified": True,
            "aud": "test-project",
        }

        before = User.objects.filter(email__iexact="fb_customer@gmail.com").count()
        response = self._exchange({"id_token": "fake-token"})
        after = User.objects.filter(email__iexact="fb_customer@gmail.com").count()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(before, 1)
        self.assertEqual(after, 1)
        self.assertEqual(response.data["user"]["id"], self.customer.id)
        self.assertEqual(response.data["user"]["user_type"], "customer")
        self.customer_profile.refresh_from_db()
        self.assertEqual(self.customer_profile.firebase_uid, "uid-customer-new")
        self.assertEqual(self.customer_profile.phone_no, "0911222002")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_unverified_email_cannot_link_by_email(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-unverified",
            "email": "fb_customer@gmail.com",
            "email_verified": False,
            "aud": "test-project",
        }
        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "email_unverified")
        self.customer_profile.refresh_from_db()
        self.assertIsNone(self.customer_profile.firebase_uid)

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_new_account_requires_profile_fields(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-brand-new",
            "email": "brandnew@gmail.com",
            "email_verified": True,
            "aud": "test-project",
        }
        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "profile_completion_required")
        self.assertFalse(User.objects.filter(email="brandnew@gmail.com").exists())

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_new_account_created_with_complete_profile(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-brand-new-2",
            "email": "brandnew2@gmail.com",
            "email_verified": True,
            "aud": "test-project",
        }
        response = self._exchange(
            {
                "id_token": "fake-token",
                "user_type": "customer",
                "username": "brandnew2",
                "first_name": "Brand",
                "last_name": "New",
                "phone_no": "0911222999",
            }
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["email"], "brandnew2@gmail.com")
        self.assertEqual(response.data["user"]["user_type"], "customer")
        user = User.objects.get(email="brandnew2@gmail.com")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.profile.firebase_uid, "uid-brand-new-2")

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["user"]["id"], user.id)

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_missing_token_rejected(self, mock_verify):
        mock_verify.side_effect = FirebaseAuthError(
            "missing_token",
            "Firebase ID token is required.",
            status=400,
        )
        response = self._exchange({})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "missing_token")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_invalid_token_rejected(self, mock_verify):
        mock_verify.side_effect = FirebaseAuthError(
            "invalid_token",
            "Firebase ID token is invalid.",
            status=401,
        )
        response = self._exchange({"id_token": "bad"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["code"], "invalid_token")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_owner_role_preserved_after_email_link(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-owner-email",
            "email": "fb_owner@gmail.com",
            "email_verified": True,
        }
        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["user_type"], "owner")
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.user_type, "owner")
        self.assertEqual(self.owner_profile.firebase_uid, "uid-owner-email")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_customer_role_preserved_after_email_link(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-customer-email",
            "email": "fb_customer@gmail.com",
            "email_verified": True,
        }
        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["user_type"], "customer")
        self.customer_profile.refresh_from_db()
        self.assertEqual(self.customer_profile.user_type, "customer")

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_existing_user_without_profile_returns_completion_required(
        self, mock_verify
    ):
        orphan = User.objects.create_user(
            username="orphan_fb",
            email="orphan_fb@gmail.com",
            password="pass12345",
            first_name="Orphan",
            last_name="User",
        )
        self.assertFalse(Profile.objects.filter(user=orphan).exists())

        mock_verify.return_value = {
            "uid": "uid-orphan",
            "email": "orphan_fb@gmail.com",
            "email_verified": True,
            "aud": "test-project",
        }
        response = self._exchange({"id_token": "fake-token"})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["code"], "profile_completion_required")
        self.assertEqual(response.data["email"], "orphan_fb@gmail.com")
        self.assertEqual(response.data["firebase_uid"], "uid-orphan")
        # Still no Profile invented; User not duplicated.
        self.assertFalse(Profile.objects.filter(user=orphan).exists())
        self.assertEqual(
            User.objects.filter(email__iexact="orphan_fb@gmail.com").count(),
            1,
        )
        # No Django session for incomplete account.
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 403)

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_existing_user_without_profile_can_complete(self, mock_verify):
        orphan = User.objects.create_user(
            username="orphan_complete",
            email="orphan_complete@gmail.com",
            password="pass12345",
            first_name="Orphan",
            last_name="Complete",
        )
        mock_verify.return_value = {
            "uid": "uid-orphan-complete",
            "email": "orphan_complete@gmail.com",
            "email_verified": True,
        }
        response = self._exchange(
            {
                "id_token": "fake-token",
                "user_type": "owner",
                "username": "orphan_complete",
                "phone_no": "0911222888",
            }
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["id"], orphan.id)
        self.assertEqual(response.data["user"]["user_type"], "owner")
        self.assertEqual(response.data["redirect"], "/owner")
        profile = Profile.objects.get(user=orphan)
        self.assertEqual(profile.firebase_uid, "uid-orphan-complete")
        self.assertEqual(profile.phone_no, "0911222888")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["user"]["id"], orphan.id)

    @patch("properties.api.auth_views.verify_firebase_id_token")
    def test_existing_user_with_profile_still_links_normally(self, mock_verify):
        mock_verify.return_value = {
            "uid": "uid-still-links",
            "email": "fb_owner@gmail.com",
            "email_verified": True,
        }
        response = self._exchange({"id_token": "fake-token"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["id"], self.owner.id)
        self.owner_profile.refresh_from_db()
        self.assertEqual(self.owner_profile.firebase_uid, "uid-still-links")
