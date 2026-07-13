# AWS S3 setup for Caplet (images)

Images (avatars, class logos/banners, lesson inline images, course covers) upload **directly from the browser to S3** using a size-limited **presigned POST** from the API. New objects first land under the private `quarantine/` prefix. The API checks their stored size, declared type, and image file signature before moving them to the public `uploads/` prefix. Videos stay as **YouTube URLs** in the database only.

## What you will create

| Piece | Purpose |
|--------|---------|
| **S3 bucket** | Stores files under `uploads/...` keys |
| **IAM user** | Access key used only by the Railway API (never the frontend) |
| **Bucket CORS** | Lets `caplet.org` / `localhost` send `PUT` to S3 |
| **Bucket policy** | Public **read only** for validated `uploads/*`; never for `quarantine/*` |

API route: **`POST /api/uploads/presign`** (requires login).  
The presign response deliberately has `publicUrl: null`. After the browser sends the file to S3, call the returned `completionUrl`; only a successful completion response contains the public URL to save.

---

## Step 1 — Create the bucket

1. AWS Console → **S3** → **Create bucket**.
2. **Bucket name**: globally unique, e.g. `caplet-prod-assets-YOURNAME`.
3. **Region**: e.g. **Asia Pacific (Sydney)** `ap-southeast-2`.
4. **Block Public Access**: leave **defaults ON** for now (we add a narrow policy in Step 4).
5. Create bucket.

---

## Step 2 — IAM user for the API

1. **IAM** → **Users** → **Create user** → name e.g. `caplet-api-s3`.
2. **Attach policies directly** → **Create policy** (JSON tab):

Replace `YOUR_BUCKET_NAME` with your bucket name.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CapletPutUploads",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:DeleteObjectVersion", "s3:AbortMultipartUpload"],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME/quarantine/*",
        "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
      ]
    },
    {
      "Sid": "CapletListOwnedUploads",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:ListBucketVersions"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME",
      "Condition": {
        "StringLike": { "s3:prefix": ["uploads/users/*"] }
      }
    }
  ]
}
```

3. Name the policy e.g. `CapletS3Uploads`, attach it to the user.
4. **Security credentials** → **Create access key** → **Application running outside AWS** → create, then copy:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`  
   Put these in **Railway** (or local `.env`). **Never** commit them to git.

---

## Step 3 — CORS on the bucket

S3 → your bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → Edit. Example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://caplet.org",
      "https://www.caplet.org",
      "https://capletedu.org",
      "https://www.capletedu.org",
      "https://caplet.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Add any extra Vercel preview origins you use. Save.

---

## Step 4 — Public read for `uploads/*` (so images display in the app)

Private buckets cannot be used as `<img src>` unless you presign every GET or use CloudFront. For Caplet we use **public read only under `uploads/`**.

1. S3 → bucket → **Permissions** → **Block public access** → **Edit** → allow **Bucket policies** (uncheck “Block public access to buckets and objects granted through new public bucket policies” if AWS requires it — read the warning carefully).
2. **Bucket policy** → add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
    }
  ]
}
```

3. Your image URL shape (what the API returns as `publicUrl`):

`https://YOUR_BUCKET_NAME.s3.ap-southeast-2.amazonaws.com/uploads/...`

Optional: later put **CloudFront** in front of the bucket and set **`S3_PUBLIC_BASE_URL`** on the API to the CloudFront domain.

If bucket versioning is enabled, keep the `s3:ListBucketVersions` and `s3:DeleteObjectVersion` permissions above. Account erasure enumerates and permanently deletes every stored version rather than leaving recoverable files behind a delete marker. Also configure an S3 lifecycle rule that expires abandoned `quarantine/` objects; they are never public, but a browser may upload to a presigned form and then omit the completion call.

---

## Step 5 — Environment variables (Railway + local)

| Variable | Example |
|----------|---------|
| `AWS_REGION` | `ap-southeast-2` |
| `AWS_S3_BUCKET` | your bucket name |
| `AWS_ACCESS_KEY_ID` | from IAM |
| `AWS_SECRET_ACCESS_KEY` | from IAM |
| `S3_PUBLIC_BASE_URL` | Optional. If set, API builds `publicUrl` from this base (e.g. CloudFront). |

Redeploy the API after changing variables.

---

## Step 6 — Verify the API

1. Log in, get a JWT.
2. `POST /api/uploads/presign` with JSON:

```json
{
  "purpose": "avatar",
  "mimeType": "image/png"
}
```

3. Submit `multipart/form-data` to `uploadUrl`, adding every returned `fields` entry before the file field.
4. `POST` the returned `completionUrl` using the same Caplet authorization. The API promotes a valid image and returns `publicUrl`.
5. Open that completion response's `publicUrl` in a browser — the image should load.

---

## Key prefixes (by purpose)

| `purpose` | Extra fields | Key pattern |
|-----------|----------------|-------------|
| `avatar` | — | `quarantine/uploads/users/{userId}/avatar-{uuid}.ext` → `uploads/users/{userId}/avatar-{uuid}.ext` |
| `classLogo` | `classId` | `quarantine/uploads/classes/{classId}/logo-{uuid}.ext` → `uploads/classes/{classId}/logo-{uuid}.ext` |
| `classBanner` | `classId` | `quarantine/uploads/classes/{classId}/banner-{uuid}.ext` → `uploads/classes/{classId}/banner-{uuid}.ext` |
| `lessonImage` | `lessonId` | `quarantine/uploads/lessons/{lessonId}/inline-{uuid}.ext` → `uploads/lessons/{lessonId}/inline-{uuid}.ext` |
| `courseCover` | `courseId` | `quarantine/uploads/courses/{courseId}/cover-{uuid}.ext` → `uploads/courses/{courseId}/cover-{uuid}.ext` |

Allowed MIME types: **jpeg, png, webp, gif**.

---

## Frontend pattern (later)

1. `POST /api/uploads/presign` with `Authorization: Bearer …`.
2. Build `FormData` containing every returned field followed by the file, then `POST` it to `uploadUrl`.
3. `POST completionUrl` with the same Caplet authorization.
4. Save the completion response's `publicUrl` on the profile/class/lesson record.
