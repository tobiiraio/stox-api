/**
 * Unit tests for Nationality + Currency feature on the Shop model and shops controller.
 * All mongoose models and external services are mocked — no real DB connection.
 */

// ---------- module mocks (must come before imports) ----------

jest.mock('../shop.model.js', () => ({
  Shop: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn()
  }
}));

jest.mock('../../users/user.model.js', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn()
  }
}));

jest.mock('../../auth/otp.model.js', () => ({
  Otp: {
    create: jest.fn(),
    updateMany: jest.fn()
  }
}));

jest.mock('../../../config/env.js', () => ({
  env: {
    otp: { length: 6, ttlMinutes: 10 }
  }
}));

jest.mock('../../../config/mail.js', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'testid12')
}));

jest.mock('bcryptjs', () => {
  const mockBcrypt = {
    hash: jest.fn().mockResolvedValue('hashedotp'),
    compare: jest.fn()
  };
  return { ...mockBcrypt, default: mockBcrypt };
});

jest.mock('../../notifications/templates/otp.template.js', () => ({
  otpEmailTemplate: jest.fn(() => ({
    subject: 'OTP',
    html: '<p>code</p>',
    text: 'code'
  }))
}));

jest.mock('../../notifications/templates/shop-renamed.template.js', () => ({
  shopRenamedEmailTemplate: jest.fn(() => ({
    subject: 'Renamed',
    html: '<p>renamed</p>',
    text: 'renamed'
  }))
}));

// ---------- imports (after mocks) ----------

import type { Request, Response } from 'express';
import { Shop } from '../shop.model.js';
import { User } from '../../users/user.model.js';
import { createShop, getShop, updateShop } from '../shops.controller.js';

// ---------- helpers ----------

function makeRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    ...overrides
  } as unknown as Request;
}

const mockShopFindOne = Shop.findOne as jest.Mock;
const mockShopFindOneAndUpdate = Shop.findOneAndUpdate as jest.Mock;
const mockShopCreate = Shop.create as jest.Mock;
const mockUserFindOne = User.findOne as jest.Mock;
const mockUserFindOneAndUpdate = User.findOneAndUpdate as jest.Mock;

// ---------- tests ----------

describe('Shop model – currency defaults', () => {
  it('creates a shop document with default currencyCode USD and currencySymbol $', async () => {
    const shopDoc = {
      shopId: 'stx_testid12',
      name: 'Test Shop',
      ownerEmail: 'owner@example.com',
      isActive: false,
      country: '',
      currencyCode: 'USD',
      currencySymbol: '$'
    };

    mockShopFindOne.mockResolvedValueOnce(null); // duplicate-check
    mockShopCreate.mockResolvedValueOnce(shopDoc);
    mockUserFindOneAndUpdate.mockResolvedValueOnce({
      _id: 'user1',
      email: 'owner@example.com',
      role: 'OWNER',
      isActive: false
    });

    // Mock Otp directly via its module
    const { Otp } = require('../../auth/otp.model.js');
    (Otp.updateMany as jest.Mock).mockResolvedValue(undefined);
    (Otp.create as jest.Mock).mockResolvedValue(undefined);

    const req = makeReq({ body: { shopName: 'Test Shop', ownerEmail: 'owner@example.com' } });
    const res = makeRes();

    await createShop(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0]?.[0] as any;
    expect(jsonArg?.shop?.currencyCode).toBe('USD');
    expect(jsonArg?.shop?.currencySymbol).toBe('$');
    expect(jsonArg?.shop?.country).toBe('');
  });
});

describe('PATCH /api/shops/:shopId – update country, currencyCode, currencySymbol', () => {
  const authedUser = { sub: 'user1', shopId: 'stx_abc123', role: 'OWNER' as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates country, currencyCode, and currencySymbol successfully', async () => {
    const existingShop = {
      shopId: 'stx_abc123',
      name: 'My Shop',
      ownerEmail: 'owner@example.com',
      isActive: true,
      country: '',
      currencyCode: 'USD',
      currencySymbol: '$'
    };

    const updatedShop = {
      ...existingShop,
      country: 'Uganda',
      currencyCode: 'UGX',
      currencySymbol: 'USh'
    };

    mockShopFindOne.mockResolvedValueOnce(existingShop);
    mockShopFindOneAndUpdate.mockResolvedValueOnce(updatedShop);

    const req = makeReq({
      body: { country: 'Uganda', currencyCode: 'UGX', currencySymbol: 'USh' },
      params: { shopId: 'stx_abc123' },
      user: authedUser
    } as any);
    const res = makeRes();

    await updateShop(req, res);

    expect(mockShopFindOneAndUpdate).toHaveBeenCalledWith(
      { shopId: 'stx_abc123' },
      expect.objectContaining({
        country: 'Uganda',
        currencyCode: 'UGX',
        currencySymbol: 'USh'
      }),
      { new: true }
    );

    const jsonArg = (res.json as jest.Mock).mock.calls[0]?.[0] as any;
    expect(jsonArg?.ok).toBe(true);
    expect(jsonArg?.shop?.country).toBe('Uganda');
    expect(jsonArg?.shop?.currencyCode).toBe('UGX');
    expect(jsonArg?.shop?.currencySymbol).toBe('USh');
  });

  it('ignores currency fields that are not provided', async () => {
    const existingShop = {
      shopId: 'stx_abc123',
      name: 'My Shop',
      ownerEmail: 'owner@example.com',
      isActive: true,
      country: 'Uganda',
      currencyCode: 'UGX',
      currencySymbol: 'USh'
    };

    const updatedShop = { ...existingShop, name: 'Renamed Shop' };

    mockShopFindOne.mockResolvedValueOnce(existingShop);
    mockShopFindOneAndUpdate.mockResolvedValueOnce(updatedShop);

    const req = makeReq({
      body: { name: 'Renamed Shop' },
      params: { shopId: 'stx_abc123' },
      user: authedUser
    } as any);
    const res = makeRes();

    await updateShop(req, res);

    const updateArg = mockShopFindOneAndUpdate.mock.calls[0]?.[1] as any;
    expect(updateArg?.country).toBeUndefined();
    expect(updateArg?.currencyCode).toBeUndefined();
    expect(updateArg?.currencySymbol).toBeUndefined();
    expect(updateArg?.name).toBe('Renamed Shop');
  });
});

describe('GET /api/shops/:shopId – returns country, currencyCode, currencySymbol', () => {
  const authedUser = { sub: 'user1', shopId: 'stx_abc123', role: 'OWNER' as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes currency fields in the response', async () => {
    const shopDoc = {
      shopId: 'stx_abc123',
      name: 'My Shop',
      ownerEmail: 'owner@example.com',
      isActive: true,
      country: 'Kenya',
      currencyCode: 'KES',
      currencySymbol: 'KSh'
    };

    mockUserFindOne.mockResolvedValueOnce({ _id: 'user1', shopId: 'stx_abc123', isActive: true });
    mockShopFindOne.mockResolvedValueOnce(shopDoc);

    const req = makeReq({
      params: { shopId: 'stx_abc123' },
      user: authedUser
    } as any);
    const res = makeRes();

    await getShop(req, res);

    const jsonArg = (res.json as jest.Mock).mock.calls[0]?.[0] as any;
    expect(jsonArg?.ok).toBe(true);
    expect(jsonArg?.shop?.country).toBe('Kenya');
    expect(jsonArg?.shop?.currencyCode).toBe('KES');
    expect(jsonArg?.shop?.currencySymbol).toBe('KSh');
  });

  it('returns 404 when shop is not found', async () => {
    mockUserFindOne.mockResolvedValueOnce({ _id: 'user1', shopId: 'stx_abc123', isActive: true });
    mockShopFindOne.mockResolvedValueOnce(null);

    const req = makeReq({
      params: { shopId: 'stx_abc123' },
      user: authedUser
    } as any);
    const res = makeRes();

    await getShop(req, res);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns 403 when user is not a member of the shop', async () => {
    mockUserFindOne.mockResolvedValueOnce(null);

    const req = makeReq({
      params: { shopId: 'stx_abc123' },
      user: authedUser
    } as any);
    const res = makeRes();

    await getShop(req, res);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(403);
  });
});
