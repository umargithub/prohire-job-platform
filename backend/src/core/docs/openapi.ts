export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ProHire API",
    version: "1.0.0",
    description: "Production-grade job board API",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              statusCode: { type: "integer" },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["candidate", "company", "admin", "super_admin", "moderator"] },
          isVerified: { type: "boolean" },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          location: { type: "string" },
          jobType: { type: "string", enum: ["full-time", "part-time", "contract", "internship", "remote"] },
          salaryMin: { type: "integer", nullable: true },
          salaryMax: { type: "integer", nullable: true },
          status: { type: "string", enum: ["active", "closed", "draft"] },
          companyName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Application: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          jobId: { type: "string", format: "uuid" },
          stage: { type: "string", enum: ["applied", "screening", "interview", "offer", "rejected"] },
          version: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": { description: "Service healthy" },
          "503": { description: "Service degraded" },
        },
      },
    },
    "/auth/register/candidate": {
      post: {
        tags: ["Auth"],
        summary: "Register candidate account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registration successful — verification email sent" },
          "409": { description: "Email already in use" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/auth/register/company": {
      post: {
        tags: ["Auth"],
        summary: "Register company account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registration successful — verification email sent" },
          "409": { description: "Email already in use" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials" },
          "403": { description: "Email not verified" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (clears refresh token cookie)",
        responses: { "204": { description: "Logged out" } },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token using httpOnly refresh cookie",
        responses: {
          "200": { description: "New access token issued" },
          "401": { description: "Missing or invalid refresh token" },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify email address",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["token"], properties: { token: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": { description: "Email verified" },
          "400": { description: "Invalid or expired token" },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: { "200": { description: "Reset email sent (always 200 — no enumeration)" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password reset successful" },
          "400": { description: "Invalid or expired token" },
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        tags: ["Auth"],
        summary: "Resend verification email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: { "200": { description: "Email sent if account exists and is unverified (always 200)" } },
      },
    },
    "/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Browse jobs (public)",
        parameters: [
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "location", schema: { type: "string" } },
          { in: "query", name: "jobType", schema: { type: "string" } },
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated job list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        jobs: { type: "array", items: { $ref: "#/components/schemas/Job" } },
                        total: { type: "integer" },
                        page: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Jobs"],
        summary: "Create job (company only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "location", "jobType"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  location: { type: "string" },
                  jobType: { type: "string" },
                  salaryMin: { type: "integer" },
                  salaryMax: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Job created" },
          "403": { description: "Not a company account" },
        },
      },
    },
    "/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get job detail (public)",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Job detail" },
          "404": { description: "Job not found" },
        },
      },
      put: {
        tags: ["Jobs"],
        summary: "Update job (company member only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Job updated" },
          "403": { description: "Forbidden" },
          "404": { description: "Job not found" },
        },
      },
      delete: {
        tags: ["Jobs"],
        summary: "Delete job (company member only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Job deleted" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/jobs/{id}/applicants": {
      get: {
        tags: ["Jobs"],
        summary: "List applicants for a job (company member only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": { description: "Applicants list" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/applications": {
      post: {
        tags: ["Applications"],
        summary: "Apply to a job (candidate only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["jobId"],
                properties: {
                  jobId: { type: "string", format: "uuid" },
                  coverLetter: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Application submitted" },
          "400": { description: "Job inactive" },
          "403": { description: "Profile required or forbidden" },
          "409": { description: "Already applied" },
        },
      },
    },
    "/applications/{id}/stage": {
      patch: {
        tags: ["Applications"],
        summary: "Update application stage with optimistic lock (company member only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["stage", "version"],
                properties: {
                  stage: { type: "string", enum: ["applied", "screening", "interview", "offer", "rejected"] },
                  version: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Stage updated" },
          "404": { description: "Application not found" },
          "409": { description: "Version conflict — optimistic lock failed" },
        },
      },
    },
    "/candidate/profile": {
      get: {
        tags: ["Candidate"],
        summary: "Get candidate profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Candidate profile" }, "404": { description: "Profile not found" } },
      },
      post: {
        tags: ["Candidate"],
        summary: "Create candidate profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["full_name"],
                properties: {
                  full_name: { type: "string" },
                  bio: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Profile created" } },
      },
      put: {
        tags: ["Candidate"],
        summary: "Update candidate profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Profile updated" } },
      },
    },
    "/candidate/profile/avatar": {
      patch: {
        tags: ["Candidate"],
        summary: "Upload candidate avatar (multipart, field: avatar)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "multipart/form-data": { schema: { type: "object", properties: { avatar: { type: "string", format: "binary" } } } } },
        },
        responses: { "200": { description: "Avatar uploaded" } },
      },
    },
    "/candidate/profile/resume": {
      patch: {
        tags: ["Candidate"],
        summary: "Upload candidate resume (multipart, field: resume)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "multipart/form-data": { schema: { type: "object", properties: { resume: { type: "string", format: "binary" } } } } },
        },
        responses: { "200": { description: "Resume uploaded" } },
      },
    },
    "/candidate/bookmarks": {
      get: {
        tags: ["Bookmarks"],
        summary: "List bookmarked jobs (candidate only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "query", name: "page", schema: { type: "integer", default: 1 } }],
        responses: { "200": { description: "Paginated bookmarks list" } },
      },
      post: {
        tags: ["Bookmarks"],
        summary: "Bookmark a job (candidate only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["jobId"], properties: { jobId: { type: "string", format: "uuid" } } },
            },
          },
        },
        responses: {
          "201": { description: "Bookmarked" },
          "409": { description: "Already bookmarked" },
        },
      },
    },
    "/candidate/bookmarks/{jobId}": {
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove bookmark (candidate only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Bookmark removed" },
          "404": { description: "Bookmark not found" },
        },
      },
    },
    "/company/profile": {
      get: {
        tags: ["Company"],
        summary: "Get company profile (any member)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Company profile" } },
      },
      put: {
        tags: ["Company"],
        summary: "Update company profile (owner only)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Profile updated" } },
      },
    },
    "/company/profile/logo": {
      patch: {
        tags: ["Company"],
        summary: "Upload company logo (owner only, multipart field: logo)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "multipart/form-data": { schema: { type: "object", properties: { logo: { type: "string", format: "binary" } } } } },
        },
        responses: { "200": { description: "Logo uploaded" } },
      },
    },
    "/company/members": {
      get: {
        tags: ["Company"],
        summary: "List company members (any member)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Members list" } },
      },
    },
    "/company/members/invite": {
      post: {
        tags: ["Company"],
        summary: "Invite a user to the company (owner only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: { "200": { description: "Invite sent" }, "404": { description: "User not found or not a company account" } },
      },
    },
    "/company/members/{userId}": {
      delete: {
        tags: ["Company"],
        summary: "Remove recruiter from company (owner only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "userId", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Member removed" }, "403": { description: "Cannot remove owner" } },
      },
    },
    "/company/transfer-ownership": {
      post: {
        tags: ["Company"],
        summary: "Transfer company ownership to a recruiter (owner only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["userId"], properties: { userId: { type: "string", format: "uuid" } } },
            },
          },
        },
        responses: { "200": { description: "Ownership transferred" }, "404": { description: "Target user not a recruiter" } },
      },
    },
    "/company/invites/accept": {
      post: {
        tags: ["Company"],
        summary: "Accept company invite (public — token from email link)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["token"], properties: { token: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Invite accepted — user added as recruiter" }, "400": { description: "Invalid or expired token" } },
      },
    },
    "/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Platform statistics",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stats" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "role", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "page", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated user list" } },
      },
    },
    "/admin/users/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get user detail",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "User detail" }, "404": { description: "Not found" } },
      },
      put: {
        tags: ["Admin"],
        summary: "Update user (role, verified status)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "User updated" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Soft-delete user",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "User deleted" } },
      },
    },
    "/admin/companies": {
      get: {
        tags: ["Admin"],
        summary: "List companies",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Paginated company list" } },
      },
    },
    "/admin/companies/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get company detail",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Company detail" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Soft-delete company",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Company deleted" } },
      },
    },
    "/admin/jobs": {
      get: {
        tags: ["Admin"],
        summary: "List all jobs",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Paginated job list" } },
      },
    },
    "/admin/jobs/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a job",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Job deleted" } },
      },
    },
  },
};
