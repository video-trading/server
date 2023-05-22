# Video Server

Enable a video server to let user create, upload, edit, view and share videos.

## Basic workflow

### ENV

```.env
# Storage
SERVER_AWS_ACCESS_KEY_ID=
SERVER_AWS_SECRET_ACCESS_KEY=
SERVER_AWS_BUCKET_NAME=
SERVER_AWS_ENDPOINT=
SERVER_AWS_REGION=
SERVER_AWS_PUBLIC_URL=
# Payment
PAYMENT_MERCHANT_ID=
PAYMENT_PUBLIC_KEY=
PAYMENT_PRIVATE_KEY=
# Rabbit MQ
RABBITMQ_URI=
# Database
DATABASE_URL=
JWT_SECRET=
```

### Upload

![](./images/Upload%20Procedure.png)
