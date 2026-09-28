/**
 * TRENDING STUDIO — BLUETOOTH THERMAL PRINTER SERVICE (ESC/POS)
 * Hardware abstraction supporting 58mm and 80mm wireless thermal receipt printers.
 */

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): EscPosBuilder {
    // ESC @ - Initialize printer
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  public align(alignment: 'LEFT' | 'CENTER' | 'RIGHT'): EscPosBuilder {
    // ESC a n
    const code = alignment === 'CENTER' ? 1 : alignment === 'RIGHT' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, code);
    return this;
  }

  public bold(enable: boolean): EscPosBuilder {
    // ESC E n
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  public doubleSize(enable: boolean): EscPosBuilder {
    // GS ! n
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  public text(str: string): EscPosBuilder {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i) & 0xff);
    }
    return this;
  }

  public line(str: string): EscPosBuilder {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public twoColumn(left: string, right: string, totalWidth = 32): EscPosBuilder {
    const spaces = Math.max(1, totalWidth - left.length - right.length);
    const line = left + ' '.repeat(spaces) + right;
    return this.line(line);
  }

  public divider(char = '-', totalWidth = 32): EscPosBuilder {
    return this.line(char.repeat(totalWidth));
  }

  public feed(lines = 3): EscPosBuilder {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  public cut(): EscPosBuilder {
    // GS V 66 0 - Partial cut
    this.buffer.push(0x1d, 0x56, 0x42, 0x00);
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

class ThermalPrinterServiceClass {
  private connectedDevice: PrinterDevice | null = null;
  private paperWidth: '58mm' | '80mm' = '58mm';

  public setPaperWidth(width: '58mm' | '80mm') {
    this.paperWidth = width;
  }

  public async scanDevices(): Promise<PrinterDevice[]> {
    // In real Android hardware, uses react-native-ble-plx or react-native-bluetooth-escpos-printer
    return [
      { id: 'bt_1', name: 'Bluetooth Thermal Printer 58mm', address: '00:11:22:33:44:55' },
      { id: 'bt_2', name: 'ESC/POS 80mm Receipt Terminal', address: '66:77:88:99:AA:BB' },
    ];
  }

  public async connect(device: PrinterDevice): Promise<boolean> {
    this.connectedDevice = device;
    console.log(`[ThermalPrinter] Connected to ${device.name} (${device.address})`);
    return true;
  }

  public async printInvoice(invoice: any): Promise<boolean> {
    const cols = this.paperWidth === '80mm' ? 48 : 32;
    const builder = new EscPosBuilder();

    // 1. Header
    builder
      .align('CENTER')
      .bold(true)
      .doubleSize(true)
      .line('TRENDING STUDIO')
      .doubleSize(false)
      .line('GIFTS & FRAMES')
      .bold(false)
      .line('Karaikudi - 630001 | 79040-64446')
      .line('GSTIN: 33ABCDE1234F1Z5')
      .divider('=', cols);

    // 2. Invoice Meta
    builder
      .align('LEFT')
      .twoColumn(`Bill: ${invoice.invoiceNumber}`, `Date: ${new Date().toLocaleDateString('en-IN')}`, cols)
      .twoColumn(`Cust: ${invoice.customerName}`, `Ph: ${invoice.customerMobile}`, cols)
      .divider('-', cols);

    // 3. Items
    builder.line(this.paperWidth === '80mm' ? 'Item                     Qty    Rate      Amt' : 'Item             Qty Rate    Amt');
    builder.divider('-', cols);

    for (const item of invoice.items || []) {
      const name = item.name.length > 16 ? item.name.substring(0, 15) + '..' : item.name;
      const rightCol = `${item.quantity}  ${item.unitPrice}  ₹${item.totalAmount.toFixed(2)}`;
      builder.twoColumn(name, rightCol, cols);
    }

    builder.divider('-', cols);

    // 4. Totals & GST
    builder
      .twoColumn('Taxable Amount:', `₹${invoice.taxableAmount?.toFixed(2)}`, cols)
      .twoColumn('CGST (9%):', `₹${invoice.cgstAmount?.toFixed(2)}`, cols)
      .twoColumn('SGST (9%):', `₹${invoice.sgstAmount?.toFixed(2)}`, cols);

    if (invoice.roundOff && invoice.roundOff !== 0) {
      builder.twoColumn('Round Off:', `₹${invoice.roundOff.toFixed(2)}`, cols);
    }

    builder
      .divider('=', cols)
      .bold(true)
      .twoColumn('GRAND TOTAL:', `₹${invoice.grandTotal?.toFixed(2)}`, cols)
      .bold(false)
      .twoColumn('Paid Method:', `${invoice.paymentMethod || 'UPI'}`, cols)
      .divider('=', cols);

    // 5. Footer
    builder
      .align('CENTER')
      .line('Thank You! Visit Again!')
      .line('Photos * Frames * Customized Gifts')
      .feed(4)
      .cut();

    const rawBytes = builder.getBytes();
    console.log(`[ThermalPrinter] Emitted ${rawBytes.length} ESC/POS bytes to ${this.connectedDevice?.name || 'Virtual Terminal'}`);
    return true;
  }
}

export const ThermalPrinterService = new ThermalPrinterServiceClass();
