export type PropertyImage = {
  id: number;
  url: string | null;
};

export type Property = {
  id: number;
  owner: number;
  title: string;
  description: string;
  property_type: string;
  property_type_display: string;
  location: string;
  price: string;
  status: "sale" | "rent" | string;
  status_display: string;
  listed_at: string;
  images: PropertyImage[];
};

export type RequestStatus = "pending" | "accepted" | "declined";

export type PropertyRequestProperty = {
  id: number;
  title: string;
  location: string;
  price: string;
  status: string;
  status_display: string;
  property_type: string;
  property_type_display: string;
  images: PropertyImage[];
  owner_name: string;
};

export type CustomerPropertyRequest = {
  id: number;
  status: RequestStatus | string;
  status_display: string;
  created_at: string;
  updated_at: string;
  property: PropertyRequestProperty;
  already_exists?: boolean;
};

export type OwnerPropertyRequest = {
  id: number;
  status: RequestStatus | string;
  status_display: string;
  created_at: string;
  updated_at: string;
  property: PropertyRequestProperty;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  property_request_id: number | null;
  property_id: number | null;
  created_at: string;
};

export type ConversationMessage = {
  id: number;
  conversation: number;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
  is_mine: boolean;
  is_read: boolean;
};

export type ConversationSummary = {
  id: number;
  property: {
    id: number;
    title: string;
    location: string;
    price: string;
    status: string;
    status_display: string;
  };
  other_participant: { id: number; name: string } | null;
  property_request_id: number | null;
  latest_message: ConversationMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  created?: boolean;
  messages?: ConversationMessage[];
};
