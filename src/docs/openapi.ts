const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 }, description: "Page number" },
  { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 }, description: "Items per page" }
];

const bearerAuth = { bearerAuth: [] };

const paginatedResponse = (itemsSchema: object) => ({
  type: "object",
  properties: {
    ok: { type: "boolean", example: true },
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 20 },
    total: { type: "integer", example: 100 },
    items: { type: "array", items: itemsSchema }
  }
});

const errorResponse = {
  type: "object",
  properties: {
    ok: { type: "boolean", example: false },
    message: { type: "string" }
  }
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "STOX API",
    version: "1.0.0",
    description: "Multi-tenant inventory management API"
  },
  servers: [{ url: "/api", description: "API base" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Error: errorResponse,
      Product: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          sku: { type: "string" },
          barcode: { type: "string" },
          categoryId: { type: "string", nullable: true },
          categoryName: { type: "string" },
          unit: { type: "string", example: "pcs" },
          costPrice: { type: "number" },
          sellPrice: { type: "number" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      InventoryBalance: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          productId: { type: "string" },
          qtyOnHand: { type: "number" },
          updatedAt: { type: "string", format: "date-time" },
          product: {
            type: "object",
            properties: {
              _id: { type: "string" },
              name: { type: "string" },
              sku: { type: "string" },
              barcode: { type: "string" },
              categoryName: { type: "string" },
              unit: { type: "string" },
              sellPrice: { type: "number" },
              isActive: { type: "boolean" }
            }
          }
        }
      },
      StockMovement: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          productId: { type: "string" },
          type: { type: "string", enum: ["PURCHASE", "SALE", "ADJUST_IN", "ADJUST_OUT"] },
          quantity: { type: "number" },
          qtyBefore: { type: "number" },
          qtyAfter: { type: "number" },
          note: { type: "string" },
          referenceType: { type: "string" },
          referenceId: { type: "string" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Sale: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          totalAmount: { type: "number" },
          totalCost: { type: "number" },
          grossProfit: { type: "number" },
          paymentMethod: { type: "string" },
          note: { type: "string" },
          soldAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Purchase: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          supplierName: { type: "string" },
          totalCost: { type: "number" },
          note: { type: "string" },
          purchasedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Category: {
        type: "object",
        properties: {
          _id: { type: "string" },
          shopId: { type: "string" },
          name: { type: "string" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" }
        }
      }
    }
  },
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": { description: "API is running" }
        }
      }
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    "/auth/otp/request": {
      post: {
        tags: ["Auth"],
        summary: "Request OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  shopId: { type: "string", description: "Required for existing shop login" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "OTP sent" },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
        }
      }
    },
    "/auth/otp/verify": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP and receive tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "shopId", "code"],
                properties: {
                  email: { type: "string", format: "email" },
                  shopId: { type: "string" },
                  code: { type: "string", minLength: 4, maxLength: 10 }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tokens issued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" }
                  }
                }
              }
            }
          },
          "401": { description: "Invalid or expired OTP" }
        }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } }
              }
            }
          }
        },
        responses: {
          "200": { description: "New access token issued" },
          "401": { description: "Invalid refresh token" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: [bearerAuth],
        responses: {
          "200": { description: "Current user" },
          "401": { description: "Unauthorized" }
        }
      }
    },

    // ── Shops ───────────────────────────────────────────────────────────────
    "/shops": {
      post: {
        tags: ["Shops"],
        summary: "Create a new shop",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shopName", "ownerEmail"],
                properties: {
                  shopName: { type: "string", minLength: 2, maxLength: 100 },
                  ownerEmail: { type: "string", format: "email" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Shop created" },
          "400": { description: "Validation error" }
        }
      },
      get: {
        tags: ["Shops"],
        summary: "List shops for authenticated user",
        security: [bearerAuth],
        responses: {
          "200": { description: "List of shops" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/shops/{shopId}": {
      get: {
        tags: ["Shops"],
        summary: "Get a shop by ID",
        security: [bearerAuth],
        parameters: [{ name: "shopId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Shop details" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" }
        }
      },
      put: {
        tags: ["Shops"],
        summary: "Update a shop",
        security: [bearerAuth],
        parameters: [{ name: "shopId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 100 },
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Updated shop" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" }
        }
      },
      delete: {
        tags: ["Shops"],
        summary: "Deactivate a shop (OWNER only)",
        security: [bearerAuth],
        parameters: [{ name: "shopId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Shop deactivated" },
          "403": { description: "Forbidden" }
        }
      }
    },

    // ── Users ───────────────────────────────────────────────────────────────
    "/users/invite": {
      post: {
        tags: ["Users"],
        summary: "Invite a staff or admin user",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["ADMIN", "STAFF"], default: "STAFF" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "User invited" },
          "401": { description: "Unauthorized" }
        }
      }
    },

    // ── Product Categories ───────────────────────────────────────────────────
    "/products/categories": {
      get: {
        tags: ["Product Categories"],
        summary: "List product categories",
        security: [bearerAuth],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by name" },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          ...paginationParams
        ],
        responses: {
          "200": {
            description: "Paginated categories",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/Category" }) } }
          }
        }
      },
      post: {
        tags: ["Product Categories"],
        summary: "Create a product category",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2, maxLength: 60 } } }
            }
          }
        },
        responses: {
          "201": { description: "Category created" }
        }
      }
    },
    "/products/categories/{id}": {
      get: {
        tags: ["Product Categories"],
        summary: "Get a category",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category details" },
          "404": { description: "Not found" }
        }
      },
      put: {
        tags: ["Product Categories"],
        summary: "Update a category",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Updated category" },
          "404": { description: "Not found" }
        }
      },
      delete: {
        tags: ["Product Categories"],
        summary: "Deactivate a category",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category deactivated" },
          "404": { description: "Not found" }
        }
      }
    },

    // ── Products ─────────────────────────────────────────────────────────────
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        security: [bearerAuth],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by name, SKU, barcode, or category" },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          ...paginationParams
        ],
        responses: {
          "200": {
            description: "Paginated products",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/Product" }) } }
          }
        }
      },
      post: {
        tags: ["Products"],
        summary: "Create a product",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "sellPrice"],
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 200 },
                  description: { type: "string" },
                  sku: { type: "string" },
                  barcode: { type: "string" },
                  categoryId: { type: "string", nullable: true },
                  unit: { type: "string", example: "pcs" },
                  costPrice: { type: "number", minimum: 0 },
                  sellPrice: { type: "number", minimum: 0 },
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Product created" },
          "400": { description: "Validation error" }
        }
      }
    },
    "/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get a product",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product details", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
          "404": { description: "Not found" }
        }
      },
      put: {
        tags: ["Products"],
        summary: "Update a product",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  sku: { type: "string" },
                  barcode: { type: "string" },
                  categoryId: { type: "string", nullable: true },
                  unit: { type: "string" },
                  costPrice: { type: "number" },
                  sellPrice: { type: "number" },
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Updated product" },
          "404": { description: "Not found" }
        }
      },
      delete: {
        tags: ["Products"],
        summary: "Deactivate a product",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product deactivated" },
          "404": { description: "Not found" }
        }
      }
    },

    // ── Inventory ────────────────────────────────────────────────────────────
    "/inventory/balances": {
      get: {
        tags: ["Inventory"],
        summary: "List inventory balances",
        security: [bearerAuth],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search by product name, SKU, or barcode" },
          { name: "lowStockOnly", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Filter items with qty ≤ 5" },
          ...paginationParams
        ],
        responses: {
          "200": {
            description: "Paginated inventory balances",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/InventoryBalance" }) } }
          }
        }
      }
    },
    "/inventory/balances/{productId}": {
      get: {
        tags: ["Inventory"],
        summary: "Get inventory balance for a product",
        security: [bearerAuth],
        parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Inventory balance" },
          "404": { description: "Not found" }
        }
      }
    },
    "/inventory/movements": {
      get: {
        tags: ["Inventory"],
        summary: "List stock movements",
        security: [bearerAuth],
        parameters: [
          { name: "productId", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["PURCHASE", "SALE", "ADJUST_IN", "ADJUST_OUT"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } }
        ],
        responses: {
          "200": {
            description: "Paginated stock movements",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/StockMovement" }) } }
          }
        }
      }
    },
    "/inventory/summary": {
      get: {
        tags: ["Inventory"],
        summary: "Inventory value summary",
        description: "Returns total inventory cost value, retail value, potential profit, and margin across all active in-stock products.",
        security: [bearerAuth],
        responses: {
          "200": {
            description: "Inventory summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    summary: {
                      type: "object",
                      properties: {
                        totalInventoryValue: { type: "number", description: "Sum of (qtyOnHand × costPrice)" },
                        totalRetailValue: { type: "number", description: "Sum of (qtyOnHand × sellPrice)" },
                        potentialProfit: { type: "number", description: "totalRetailValue − totalInventoryValue" },
                        margin: { type: "number", description: "Gross margin percentage" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/inventory/adjustments": {
      post: {
        tags: ["Inventory"],
        summary: "Adjust stock (OWNER / ADMIN only)",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "type", "quantity"],
                properties: {
                  productId: { type: "string" },
                  type: { type: "string", enum: ["ADJUST_IN", "ADJUST_OUT"] },
                  quantity: { type: "number", minimum: 0.001 },
                  note: { type: "string", maxLength: 500 }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Adjustment applied" },
          "400": { description: "Validation error" },
          "403": { description: "Forbidden" }
        }
      }
    },

    // ── Purchases ────────────────────────────────────────────────────────────
    "/purchases": {
      get: {
        tags: ["Purchases"],
        summary: "List purchases",
        security: [bearerAuth],
        parameters: paginationParams,
        responses: {
          "200": {
            description: "Paginated purchases",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/Purchase" }) } }
          }
        }
      },
      post: {
        tags: ["Purchases"],
        summary: "Record a purchase (restocks inventory)",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  supplierName: { type: "string" },
                  note: { type: "string" },
                  purchasedAt: { type: "string", format: "date-time" },
                  items: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["productId", "quantity", "unitCost"],
                      properties: {
                        productId: { type: "string" },
                        quantity: { type: "number", minimum: 0.001 },
                        unitCost: { type: "number", minimum: 0 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Purchase recorded" },
          "400": { description: "Validation error" }
        }
      }
    },
    "/purchases/{id}": {
      get: {
        tags: ["Purchases"],
        summary: "Get a purchase with its line items",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Purchase details" },
          "404": { description: "Not found" }
        }
      }
    },

    // ── Sales ────────────────────────────────────────────────────────────────
    "/sales": {
      get: {
        tags: ["Sales"],
        summary: "List sales",
        security: [bearerAuth],
        parameters: paginationParams,
        responses: {
          "200": {
            description: "Paginated sales",
            content: { "application/json": { schema: paginatedResponse({ $ref: "#/components/schemas/Sale" }) } }
          }
        }
      },
      post: {
        tags: ["Sales"],
        summary: "Record a sale (deducts inventory)",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  paymentMethod: { type: "string", example: "CASH" },
                  note: { type: "string" },
                  soldAt: { type: "string", format: "date-time" },
                  items: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "string" },
                        quantity: { type: "number", minimum: 0.001 },
                        unitPrice: { type: "number", description: "Overrides product sellPrice if provided" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Sale recorded" },
          "400": { description: "Validation error or insufficient stock" }
        }
      }
    },
    "/sales/{id}": {
      get: {
        tags: ["Sales"],
        summary: "Get a sale with its line items",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Sale details" },
          "404": { description: "Not found" }
        }
      }
    },

    // ── Reports ──────────────────────────────────────────────────────────────
    "/reports/sales-summary": {
      get: {
        tags: ["Reports"],
        summary: "Sales summary (revenue, cost, profit)",
        security: [bearerAuth],
        parameters: [
          { name: "period", in: "query", schema: { type: "string", enum: ["today", "week", "month", "year"] } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" }, description: "YYYY-MM-DD, overrides period" },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" }, description: "YYYY-MM-DD, overrides period" }
        ],
        responses: {
          "200": {
            description: "Sales summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    range: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } },
                    summary: {
                      type: "object",
                      properties: {
                        salesCount: { type: "integer" },
                        revenue: { type: "number" },
                        cost: { type: "number" },
                        profit: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/reports/top-products": {
      get: {
        tags: ["Reports"],
        summary: "Top products by quantity sold",
        security: [bearerAuth],
        parameters: [
          { name: "period", in: "query", schema: { type: "string", enum: ["today", "week", "month", "year"] } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 50 } }
        ],
        responses: {
          "200": { description: "Top products list" }
        }
      }
    },
    "/reports/low-stock": {
      get: {
        tags: ["Reports"],
        summary: "Products with stock ≤ 5",
        security: [bearerAuth],
        responses: {
          "200": { description: "Low stock items" }
        }
      }
    }
  }
};
