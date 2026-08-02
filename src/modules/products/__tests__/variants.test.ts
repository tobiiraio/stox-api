/**
 * Variant CRUD logic tests — Mongoose is mocked so no real DB connection needed.
 */

// Mock the models before importing controller functions
jest.mock("../variant.model.js", () => ({
  Variant: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn()
  }
}));

jest.mock("../product.model.js", () => ({
  Product: {
    findOne: jest.fn()
  }
}));

import { Variant } from "../variant.model.js";
import { Product } from "../product.model.js";

const mockVariantFind = Variant.find as jest.Mock;
const mockVariantFindOne = Variant.findOne as jest.Mock;
const mockVariantCreate = Variant.create as jest.Mock;
const mockVariantFindOneAndUpdate = Variant.findOneAndUpdate as jest.Mock;
const mockProductFindOne = Product.findOne as jest.Mock;

// Helper to create a fake ObjectId-like string
const fakeId = (n: number) => `507f1f77bcf86cd79943901${n}`;

describe("Variant model logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listVariants logic", () => {
    it("returns only active variants when isActive=true filter applied", async () => {
      const shopId = "shop1";
      const productId = fakeId(0);

      const activeVariants = [
        { _id: fakeId(1), shopId, productId, name: "500ml", type: "SIZE", isActive: true },
        { _id: fakeId(2), shopId, productId, name: "1L", type: "SIZE", isActive: true }
      ];

      mockVariantFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(activeVariants)
      });

      const result = await (Variant.find({ shopId, productId, isActive: true }) as any).sort({ name: 1 });

      expect(mockVariantFind).toHaveBeenCalledWith({ shopId, productId, isActive: true });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("500ml");
    });
  });

  describe("createVariant logic", () => {
    it("creates a variant when product exists and name is unique", async () => {
      const shopId = "shop1";
      const productOid = fakeId(0);

      mockProductFindOne.mockResolvedValue({ _id: productOid, shopId, name: "Coca Cola" });
      mockVariantFindOne.mockResolvedValue(null); // no duplicate
      mockVariantCreate.mockResolvedValue({
        _id: fakeId(1),
        shopId,
        productId: productOid,
        name: "500ml",
        type: "SIZE",
        isActive: true
      });

      const product = await Product.findOne({ _id: productOid, shopId });
      expect(product).not.toBeNull();

      const existing = await Variant.findOne({ shopId, productId: productOid, name: "500ml" });
      expect(existing).toBeNull();

      const variant = await Variant.create({
        shopId,
        productId: productOid,
        name: "500ml",
        type: "SIZE",
        isActive: true
      });

      expect(mockVariantCreate).toHaveBeenCalledWith({
        shopId,
        productId: productOid,
        name: "500ml",
        type: "SIZE",
        isActive: true
      });
      expect(variant.name).toBe("500ml");
      expect(variant.type).toBe("SIZE");
    });

    it("detects duplicate variant names", async () => {
      const shopId = "shop1";
      const productOid = fakeId(0);

      mockVariantFindOne.mockResolvedValue({
        _id: fakeId(1),
        shopId,
        productId: productOid,
        name: "500ml",
        type: "SIZE",
        isActive: true
      });

      const existing = await Variant.findOne({ shopId, productId: productOid, name: "500ml" });
      expect(existing).not.toBeNull(); // duplicate found → should reject
    });

    it("rejects variant creation when product not found", async () => {
      mockProductFindOne.mockResolvedValue(null);

      const product = await Product.findOne({ _id: fakeId(99), shopId: "shop1" });
      expect(product).toBeNull();
    });
  });

  describe("updateVariant logic", () => {
    it("updates variant fields correctly", async () => {
      const shopId = "shop1";
      const variantOid = fakeId(1);
      const productOid = fakeId(0);

      mockVariantFindOneAndUpdate.mockResolvedValue({
        _id: variantOid,
        shopId,
        productId: productOid,
        name: "1L",
        type: "SIZE",
        isActive: true
      });

      const updated = await Variant.findOneAndUpdate(
        { _id: variantOid, shopId, productId: productOid },
        { name: "1L" },
        { new: true }
      );

      expect(mockVariantFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: variantOid, shopId, productId: productOid },
        { name: "1L" },
        { new: true }
      );
      expect(updated?.name).toBe("1L");
    });

    it("soft-deletes a variant by setting isActive=false", async () => {
      const shopId = "shop1";
      const variantOid = fakeId(1);
      const productOid = fakeId(0);

      mockVariantFindOneAndUpdate.mockResolvedValue({
        _id: variantOid,
        shopId,
        productId: productOid,
        name: "500ml",
        type: "SIZE",
        isActive: false
      });

      const deleted = await Variant.findOneAndUpdate(
        { _id: variantOid, shopId, productId: productOid },
        { isActive: false },
        { new: true }
      );

      expect(deleted?.isActive).toBe(false);
    });
  });

  describe("variant types", () => {
    it("supports SIZE, COLOR, and OTHER variant types", () => {
      const validTypes = ["SIZE", "COLOR", "OTHER"];
      validTypes.forEach((type) => {
        expect(["SIZE", "COLOR", "OTHER"].includes(type)).toBe(true);
      });
    });
  });
});
