/**
 * TRENDING STUDIO — DYNAMIC PRICING ENGINE
 * Calculates photo printing prices, paper finishes, laminations,
 * and custom photo frame construction costs.
 */

import {
  PaperFinish,
  LaminationType,
  IPhotoPrintSizePrice,
  IFrameType,
  IFramePriceConfig,
} from '@trending-studio/shared-types';
import { round2 } from '@trending-studio/utils';

/**
 * Trending Studio Initial Photo Print Seed Price Matrix
 * Exact reference prices from user prompt
 */
export const INITIAL_PHOTO_PRINT_PRICES: Array<{
  size: string;
  width: number;
  height: number;
  price: number;
}> = [
  { size: '4x6', width: 4, height: 6, price: 10 },
  { size: '6x8', width: 6, height: 8, price: 25 },
  { size: '10x8', width: 10, height: 8, price: 45 },
  { size: '12x8', width: 12, height: 8, price: 50 },
  { size: '12x10', width: 12, height: 10, price: 60 },
  { size: '10x15', width: 10, height: 15, price: 75 },
  { size: '12x15', width: 12, height: 15, price: 90 },
  { size: '12x18', width: 12, height: 18, price: 110 },
  { size: '12x20', width: 12, height: 20, price: 120 },
  { size: '12x24', width: 12, height: 24, price: 150 },
  { size: '16x20', width: 16, height: 20, price: 400 },
  { size: '16x24', width: 16, height: 24, price: 480 },
  { size: '20x24', width: 20, height: 24, price: 600 },
  { size: '20x30', width: 20, height: 30, price: 750 },
  { size: '24x30', width: 24, height: 30, price: 900 },
  { size: '24x36', width: 24, height: 36, price: 1080 },
  { size: '36x40', width: 36, height: 40, price: 1800 },
  { size: '36x60', width: 36, height: 60, price: 2700 },
];

export const PAPER_FINISH_RATES: Record<PaperFinish, number> = {
  [PaperFinish.GLOSSY]: 0,
  [PaperFinish.MATTE]: 0.10,
  [PaperFinish.LUSTER]: 0.15,
  [PaperFinish.METALLIC]: 0.25,
  [PaperFinish.CANVAS]: 0.40,
};

export const LAMINATION_RATES: Record<LaminationType, number> = {
  [LaminationType.NONE]: 0,
  [LaminationType.COLD_MATTE]: 15,
  [LaminationType.COLD_GLOSS]: 15,
  [LaminationType.THERMAL_MATTE]: 25,
  [LaminationType.VELVET]: 40,
  [LaminationType.SPARKLE]: 35,
};

export interface PhotoPrintCalculationParams {
  size: string; // e.g. "12x18"
  quantity: number;
  paperFinish?: PaperFinish;
  lamination?: LaminationType;
  customBasePrice?: number;
  priceCatalog?: IPhotoPrintSizePrice[];
}

export interface PhotoPrintCalculationResult {
  size: string;
  quantity: number;
  baseUnitPrice: number;
  finishMultiplier: number;
  finishSurcharge: number;
  laminationSurcharge: number;
  finalUnitPrice: number;
  totalPrice: number;
}

/**
 * Calculate dynamic photo print pricing
 */
export function calculatePhotoPrintPrice(
  params: PhotoPrintCalculationParams
): PhotoPrintCalculationResult {
  const quantity = Math.max(1, params.quantity);
  const finish = params.paperFinish || PaperFinish.GLOSSY;
  const lamination = params.lamination || LaminationType.NONE;

  // 1. Resolve base price from catalog or seed matrix
  let baseUnitPrice = 0;
  if (params.customBasePrice !== undefined) {
    baseUnitPrice = params.customBasePrice;
  } else if (params.priceCatalog && params.priceCatalog.length > 0) {
    const item = params.priceCatalog.find(
      (p) => p.size.toLowerCase() === params.size.toLowerCase() && p.isActive
    );
    baseUnitPrice = item ? item.basePrice : 0;
  }

  if (!baseUnitPrice) {
    const seed = INITIAL_PHOTO_PRINT_PRICES.find(
      (p) => p.size.toLowerCase() === params.size.toLowerCase()
    );
    baseUnitPrice = seed ? seed.price : 50; // Fallback default
  }

  // 2. Paper Finish Multipliers
  let finishMultiplier = 1.0;
  switch (finish) {
    case PaperFinish.GLOSSY:
      finishMultiplier = 1.0;
      break;
    case PaperFinish.MATTE:
      finishMultiplier = 1.1; // +10%
      break;
    case PaperFinish.LUSTER:
      finishMultiplier = 1.15; // +15%
      break;
    case PaperFinish.METALLIC:
      finishMultiplier = 1.25; // +25%
      break;
    case PaperFinish.CANVAS:
      finishMultiplier = 1.4; // +40%
      break;
  }

  const finishSurcharge = round2(baseUnitPrice * (finishMultiplier - 1));

  // 3. Lamination Add-ons
  let laminationSurcharge = 0;
  switch (lamination) {
    case LaminationType.NONE:
      laminationSurcharge = 0;
      break;
    case LaminationType.COLD_MATTE:
    case LaminationType.COLD_GLOSS:
      laminationSurcharge = 15;
      break;
    case LaminationType.THERMAL_MATTE:
      laminationSurcharge = 25;
      break;
    case LaminationType.VELVET:
      laminationSurcharge = 40;
      break;
    case LaminationType.SPARKLE:
      laminationSurcharge = 35;
      break;
  }

  const finalUnitPrice = round2(baseUnitPrice + finishSurcharge + laminationSurcharge);
  const totalPrice = round2(finalUnitPrice * quantity);

  return {
    size: params.size,
    quantity,
    baseUnitPrice,
    finishMultiplier,
    finishSurcharge,
    laminationSurcharge,
    finalUnitPrice,
    totalPrice,
  };
}

export interface CustomFrameCalculationParams {
  widthInches: number;
  heightInches: number;
  frameType?: IFrameType;
  ratePerInch?: number; // fallback moulding rate per perimeter inch
  hasGlass?: boolean;
  glassType?: 'STANDARD' | 'NON_REFLECTIVE_ACRYLIC';
  hasMount?: boolean;
  mountBorderInches?: number;
  assemblyFee?: number;
}

export interface CustomFrameCalculationResult {
  widthInches: number;
  heightInches: number;
  perimeterInches: number;
  areaSqInches: number;
  mouldingCost: number;
  glassCost: number;
  mountCost: number;
  backingCost: number;
  assemblyCost: number;
  totalFramePrice: number;
}

/**
 * Calculate custom photo frame construction costs based on dimensions and materials
 */
export function calculateCustomFramePrice(
  params: CustomFrameCalculationParams
): CustomFrameCalculationResult {
  const width = Math.max(1, params.widthInches);
  const height = Math.max(1, params.heightInches);
  const perimeterInches = round2(2 * (width + height));
  const areaSqInches = round2(width * height);

  // Moulding cost: Perimeter * ratePerInch
  const mouldingRate = params.frameType?.ratePerInch ?? params.ratePerInch ?? 6.5; // default ₹6.50/inch
  const mouldingCost = round2(perimeterInches * mouldingRate);

  // Glass / Acrylic cost: based on area
  let glassCost = 0;
  if (params.hasGlass) {
    const glassRatePerSqInch =
      params.glassType === 'NON_REFLECTIVE_ACRYLIC' ? 0.95 : 0.45;
    glassCost = round2(areaSqInches * glassRatePerSqInch);
  }

  // Mount Board cost
  let mountCost = 0;
  if (params.hasMount) {
    const border = params.mountBorderInches || 2;
    const mountedArea = (width + 2 * border) * (height + 2 * border);
    mountCost = round2(mountedArea * 0.35); // ₹0.35 per sq inch of mount board
  }

  // Backing MDF sheet
  const backingCost = round2(areaSqInches * 0.25);

  // Assembly fee
  const assemblyCost = params.assemblyFee ?? 50;

  const totalFramePrice = round2(
    mouldingCost + glassCost + mountCost + backingCost + assemblyCost
  );

  return {
    widthInches: width,
    heightInches: height,
    perimeterInches,
    areaSqInches,
    mouldingCost,
    glassCost,
    mountCost,
    backingCost,
    assemblyCost,
    totalFramePrice,
  };
}

/**
 * Trending Studio Print with Frame Authentic Price Matrix
 * Exact rates from Trending Studio Karaikudi pricing chart
 */
export interface IPrintWithFrameMatrixRow {
  size: string;
  width: number;
  height: number;
  halfInch: number | null;
  oneInch: number | null;
  oneAndHalfInch: number | null;
  twoInch: number | null;
}

export const PRINT_WITH_FRAME_PRICE_MATRIX: IPrintWithFrameMatrixRow[] = [
  { size: '4x6', width: 4, height: 6, halfInch: 60, oneInch: null, oneAndHalfInch: null, twoInch: null },
  { size: '6x8', width: 6, height: 8, halfInch: 120, oneInch: null, oneAndHalfInch: null, twoInch: null },
  { size: '10x8', width: 10, height: 8, halfInch: null, oneInch: 260, oneAndHalfInch: null, twoInch: null },
  { size: '12x8', width: 12, height: 8, halfInch: null, oneInch: 310, oneAndHalfInch: null, twoInch: null },
  { size: '12x10', width: 12, height: 10, halfInch: null, oneInch: 390, oneAndHalfInch: null, twoInch: null },
  { size: '10x15', width: 10, height: 15, halfInch: null, oneInch: 490, oneAndHalfInch: null, twoInch: null },
  { size: '12x15', width: 12, height: 15, halfInch: null, oneInch: 590, oneAndHalfInch: 675, twoInch: null },
  { size: '12x18', width: 12, height: 18, halfInch: null, oneInch: 700, oneAndHalfInch: 810, twoInch: null },
  { size: '12x20', width: 12, height: 20, halfInch: null, oneInch: 780, oneAndHalfInch: 900, twoInch: null },
  { size: '12x24', width: 12, height: 24, halfInch: null, oneInch: 940, oneAndHalfInch: 1080, twoInch: null },
  { size: '16x20', width: 16, height: 20, halfInch: null, oneInch: 1050, oneAndHalfInch: 1200, twoInch: 1280 },
  { size: '16x24', width: 16, height: 24, halfInch: null, oneInch: 1250, oneAndHalfInch: 1440, twoInch: 1540 },
  { size: '20x24', width: 20, height: 24, halfInch: null, oneInch: 1560, oneAndHalfInch: 1800, twoInch: 1920 },
  { size: '20x30', width: 20, height: 30, halfInch: null, oneInch: 1950, oneAndHalfInch: 2250, twoInch: 2400 },
  { size: '24x30', width: 24, height: 30, halfInch: null, oneInch: 2340, oneAndHalfInch: 2700, twoInch: 2880 },
  { size: '24x36', width: 24, height: 36, halfInch: null, oneInch: 2810, oneAndHalfInch: 3240, twoInch: 3460 },
  { size: '36x30', width: 36, height: 30, halfInch: null, oneInch: 3510, oneAndHalfInch: 4050, twoInch: 4320 },
  { size: '36x40', width: 36, height: 40, halfInch: null, oneInch: 4680, oneAndHalfInch: 5400, twoInch: 5760 },
  { size: '36x60', width: 36, height: 60, halfInch: null, oneInch: 7020, oneAndHalfInch: 8100, twoInch: 8640 },
];
