/**
 * Unit conversion tests for createPurchaseWithItems.
 * Mocks all Mongoose models and the inventory service so no DB is needed.
 */

jest.mock("../purchase.model.js", () => ({
  Purchase: {
    create: jest.fn()
  }
}));

jest.mock("../purchaseItem.model.js", () => ({
  PurchaseItem: {
    insertMany: jest.fn()
  }
}));

jest.mock("../../products/product.model.js", () => ({
  Product: {
    findOne: jest.fn(),
    updateOne: jest.fn()
  }
}));

jest.mock("../../inventory/inventory.service.js", () => ({
  applyStockChange: jest.fn()
}));

import { createPurchaseWithItems, parseCreatePurchaseInput } from "../purchases.service.js";
import { Product } from "../../products/product.model.js";
import { Purchase } from "../purchase.model.js";
import { PurchaseItem } from "../purchaseItem.model.js";
import { applyStockChange } from "../../inventory/inventory.service.js";

const mockProductFindOne = Product.findOne as jest.Mock;
const mockProductUpdateOne = Product.updateOne as jest.Mock;
const mockPurchaseCreate = Purchase.create as jest.Mock;
const mockPurchaseItemInsertMany = PurchaseItem.insertMany as jest.Mock;
const mockApplyStockChange = applyStockChange as jest.Mock;

const fakeObjectId = "507f1f77bcf86cd799439011";

function makeFakePurchase(overrides = {}) {
  return {
    _id: "purchase_id_1",
    shopId: "shop1",
    supplierName: "Supplier A",
    invoiceNumber: "",
    totalAmount: 0,
    purchasedAt: new Date(),
    notes: "",
    ...overrides
  };
}

describe("parseCreatePurchaseInput", () => {
  it("parses a valid purchase input", () => {
    const raw = {
      items: [
        { productId: fakeObjectId, quantity: 5, unitCost: 10 }
      ],
      paymentMethod: "CASH"
    };
    const parsed = parseCreatePurchaseInput(raw);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.quantity).toBe(5);
  });

  it("parses isPackPurchase flag", () => {
    const raw = {
      items: [
        { productId: fakeObjectId, quantity: 3, unitCost: 100, isPackPurchase: true }
      ]
    };
    const parsed = parseCreatePurchaseInput(raw);
    expect(parsed.items[0]?.isPackPurchase).toBe(true);
  });

  it("rejects quantity <= 0", () => {
    const raw = {
      items: [{ productId: fakeObjectId, quantity: 0, unitCost: 10 }]
    };
    expect(() => parseCreatePurchaseInput(raw)).toThrow();
  });
});

describe("createPurchaseWithItems — pack conversion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProductUpdateOne.mockResolvedValue({});
    mockApplyStockChange.mockResolvedValue({});
  });

  it("multiplies quantity by packSize when isPackPurchase=true and packSize>1", async () => {
    const shopId = "shop1";

    mockProductFindOne.mockResolvedValue({
      _id: fakeObjectId,
      shopId,
      name: "Soda",
      isActive: true,
      costPrice: 50,
      sellPrice: 100,
      packSize: 24  // 1 carton = 24 bottles
    });

    mockPurchaseCreate.mockResolvedValue(makeFakePurchase());
    mockPurchaseItemInsertMany.mockResolvedValue([
      {
        productId: fakeObjectId,
        quantity: 48, // 2 cartons * 24
        unitCost: 20,
        lineTotal: 960,
        packsOrdered: 2,
        packSizeSnapshot: 24
      }
    ]);

    const input = parseCreatePurchaseInput({
      items: [
        {
          productId: fakeObjectId,
          quantity: 2,       // 2 cartons
          unitCost: 20,
          isPackPurchase: true
        }
      ]
    });

    await createPurchaseWithItems(shopId, input);

    // PurchaseItem.insertMany should have been called with sell-unit quantity (2*24=48)
    expect(mockPurchaseItemInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 48,          // sell units
          packsOrdered: 2,       // packs ordered
          packSizeSnapshot: 24   // packSize at time of purchase
        })
      ])
    );

    // applyStockChange should also receive sell-unit quantity
    expect(mockApplyStockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 48,
        type: "PURCHASE"
      })
    );
  });

  it("does NOT multiply when isPackPurchase=false", async () => {
    const shopId = "shop1";

    mockProductFindOne.mockResolvedValue({
      _id: fakeObjectId,
      shopId,
      name: "Soda",
      isActive: true,
      costPrice: 50,
      sellPrice: 100,
      packSize: 24
    });

    mockPurchaseCreate.mockResolvedValue(makeFakePurchase());
    mockPurchaseItemInsertMany.mockResolvedValue([
      { productId: fakeObjectId, quantity: 5, unitCost: 20, lineTotal: 100, packsOrdered: null, packSizeSnapshot: 1 }
    ]);

    const input = parseCreatePurchaseInput({
      items: [
        {
          productId: fakeObjectId,
          quantity: 5,
          unitCost: 20,
          isPackPurchase: false
        }
      ]
    });

    await createPurchaseWithItems(shopId, input);

    expect(mockPurchaseItemInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 5,           // unchanged
          packsOrdered: null,    // no pack conversion
          packSizeSnapshot: 1
        })
      ])
    );

    expect(mockApplyStockChange).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 5 })
    );
  });

  it("does NOT multiply when packSize=1 even if isPackPurchase=true", async () => {
    const shopId = "shop1";

    mockProductFindOne.mockResolvedValue({
      _id: fakeObjectId,
      shopId,
      name: "Widget",
      isActive: true,
      costPrice: 10,
      sellPrice: 20,
      packSize: 1   // no pack conversion applicable
    });

    mockPurchaseCreate.mockResolvedValue(makeFakePurchase());
    mockPurchaseItemInsertMany.mockResolvedValue([
      { productId: fakeObjectId, quantity: 10, unitCost: 5, lineTotal: 50, packsOrdered: null, packSizeSnapshot: 1 }
    ]);

    const input = parseCreatePurchaseInput({
      items: [
        {
          productId: fakeObjectId,
          quantity: 10,
          unitCost: 5,
          isPackPurchase: true  // flag set but packSize=1, no conversion expected
        }
      ]
    });

    await createPurchaseWithItems(shopId, input);

    expect(mockPurchaseItemInsertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 10,       // not multiplied (packSize=1)
          packsOrdered: null  // no conversion applied
        })
      ])
    );
  });

  it("stores variantId in purchase items when provided", async () => {
    const shopId = "shop1";
    const variantId = "507f1f77bcf86cd799439022";

    mockProductFindOne.mockResolvedValue({
      _id: fakeObjectId,
      shopId,
      name: "T-Shirt",
      isActive: true,
      costPrice: 5,
      sellPrice: 15,
      packSize: 1
    });

    mockPurchaseCreate.mockResolvedValue(makeFakePurchase());
    mockPurchaseItemInsertMany.mockResolvedValue([
      { productId: fakeObjectId, variantId, quantity: 20, unitCost: 5, lineTotal: 100 }
    ]);

    const input = parseCreatePurchaseInput({
      items: [
        {
          productId: fakeObjectId,
          variantId,
          quantity: 20,
          unitCost: 5
        }
      ]
    });

    await createPurchaseWithItems(shopId, input);

    // applyStockChange should include variantId
    expect(mockApplyStockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId,
        quantity: 20
      })
    );
  });

  it("throws if product not found", async () => {
    mockProductFindOne.mockResolvedValue(null);

    const input = parseCreatePurchaseInput({
      items: [{ productId: fakeObjectId, quantity: 1, unitCost: 10 }]
    });

    await expect(createPurchaseWithItems("shop1", input)).rejects.toThrow("Product not found or inactive");
  });
});
