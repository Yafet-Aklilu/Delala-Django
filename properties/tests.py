from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

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
