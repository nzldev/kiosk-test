// thermalPrinter.js
// Thermal Printer Utility Functions

class ThermalPrinter {
  constructor() {
    this.printer = null
    this.config = null
    this.isConnected = false
    this.paperWidth = 48 // Standard thermal printer width in characters
    
    // Bluetooth specific properties
    this.bluetoothDevice = null
    this.gattServer = null
    this.printService = null
    this.writeCharacteristic = null
  }

  // Initialize printer connection
  async initialize(printer, config) {
    this.printer = printer
    this.config = {
      paperWidth: config.paperWidth || 48,
      baudRate: config.baudRate || 9600,
      encoding: config.encoding || 'utf8',
      ...config
    }

    try {
      if (printer.type === 'ip') {
        await this.connectToNetworkPrinter(printer.address, printer.port)
      } else if (printer.type === 'usb') {
        await this.connectToUSBPrinter(printer.id)
      } else if (printer.type === 'bluetooth') {
        await this.connectToBluetoothPrinter(printer.id)
      }
      
      this.isConnected = true
      return true
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect to printer: ${error.message}`)
    }
  }

  // Network printer connection
  async connectToNetworkPrinter(address, port) {
    return new Promise((resolve, reject) => {
      // Simulate network connection
      setTimeout(() => {
        const success = Math.random() > 0.2 // 80% success rate
        if (success) {
          console.log(`Connected to network printer at ${address}:${port}`)
          resolve()
        } else {
          reject(new Error('Network connection failed'))
        }
      }, 1000)
    })
  }

  // USB printer connection
  async connectToUSBPrinter(deviceId) {
    return new Promise((resolve, reject) => {
      // In a real implementation, you would use Web USB API
      if ('usb' in navigator) {
        // Web USB implementation would go here
        console.log(`Attempting USB connection to ${deviceId}`)
        setTimeout(() => {
          resolve()
        }, 800)
      } else {
        reject(new Error('USB not supported in this browser'))
      }
    })
  }

  // Bluetooth printer connection
  async connectToBluetoothPrinter(deviceId) {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported in this browser')
    }

    try {
      // If device object is passed instead of just ID
      if (this.printer.device) {
        this.bluetoothDevice = this.printer.device
      } else {
        // Request device if not already available
        this.bluetoothDevice = await navigator.bluetooth.requestDevice({
          filters: [
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
            { namePrefix: 'POS' },
            { namePrefix: 'Thermal' },
            { namePrefix: 'Receipt' }
          ],
          optionalServices: ['battery_service']
        })
      }

      // Connect to GATT server
      this.gattServer = await this.bluetoothDevice.gatt.connect()
      
      // Get the print service
      this.printService = await this.gattServer.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
      
      // Get the write characteristic for sending print data
      this.writeCharacteristic = await this.printService.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
      
      console.log(`Connected to Bluetooth printer: ${this.bluetoothDevice.name}`)
      
    } catch (error) {
      console.error('Bluetooth connection failed:', error)
      throw new Error(`Bluetooth connection failed: ${error.message}`)
    }
  }

  // ESC/POS command builders
  buildCommand(commands) {
    const ESC = '\x1B'
    const GS = '\x1D'
    
    const commandMap = {
      INIT: ESC + '@',
      RESET: ESC + '@',
      FONT_A: ESC + 'M\x00',
      FONT_B: ESC + 'M\x01',
      BOLD_ON: ESC + 'E\x01',
      BOLD_OFF: ESC + 'E\x00',
      UNDERLINE_ON: ESC + '-\x01',
      UNDERLINE_OFF: ESC + '-\x00',
      ALIGN_LEFT: ESC + 'a\x00',
      ALIGN_CENTER: ESC + 'a\x01',
      ALIGN_RIGHT: ESC + 'a\x02',
      SIZE_NORMAL: GS + '!\x00',
      SIZE_DOUBLE_WIDTH: GS + '!\x20',
      SIZE_DOUBLE_HEIGHT: GS + '!\x10',
      SIZE_DOUBLE: GS + '!\x30',
      CUT_PAPER: GS + 'V\x41\x00',
      FEED_LINE: '\n',
      FEED_LINES: (n) => '\n'.repeat(n || 1),
      LINE_SPACING_DEFAULT: ESC + '2',
      LINE_SPACING_NARROW: ESC + '3\x10'
    }

    let commandString = ''
    
    commands.forEach(cmd => {
      if (typeof cmd === 'string') {
        commandString += commandMap[cmd] || cmd
      } else if (typeof cmd === 'function') {
        commandString += cmd()
      }
    })
    
    return commandString
  }

  // Format text to fit printer width
  formatText(text, align = 'left', width = null) {
    const maxWidth = width || this.config.paperWidth
    
    if (text.length > maxWidth) {
      // Wrap text
      const words = text.split(' ')
      const lines = []
      let currentLine = ''
      
      words.forEach(word => {
        if ((currentLine + word).length <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      })
      
      if (currentLine) lines.push(currentLine)
      return lines.map(line => this.alignText(line, align, maxWidth)).join('\n')
    }
    
    return this.alignText(text, align, maxWidth)
  }

  // Align text within specified width
  alignText(text, align, width) {
    if (text.length >= width) return text.substring(0, width)
    
    const padding = width - text.length
    
    switch (align) {
      case 'center':
        const leftPad = Math.floor(padding / 2)
        const rightPad = padding - leftPad
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
      
      case 'right':
        return ' '.repeat(padding) + text
      
      default: // left
        return text + ' '.repeat(padding)
    }
  }

  // Create separator line
  createSeparator(char = '-', width = null) {
    const lineWidth = width || this.config.paperWidth
    return char.repeat(lineWidth)
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Send data to printer
  async sendToPrinter(data) {
    if (!this.isConnected) {
      throw new Error('Printer not connected')
    }

    try {
      if (this.printer.type === 'bluetooth' && this.writeCharacteristic) {
        await this.sendBluetoothData(data)
      } else if (this.printer.type === 'ip') {
        await this.sendNetworkData(data)
      } else if (this.printer.type === 'usb') {
        await this.sendUSBData(data)
      } else {
        // Fallback simulation
        await this.simulatePrint(data)
      }
      
      console.log('Print job completed successfully')
      
    } catch (error) {
      console.error('Print failed:', error)
      throw new Error(`Print job failed: ${error.message}`)
    }
  }

  // Send data via Bluetooth
  async sendBluetoothData(data) {
    if (!this.writeCharacteristic) {
      throw new Error('Bluetooth characteristic not available')
    }

    try {
      // Convert string to ArrayBuffer
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      
      // Split data into chunks (Bluetooth has packet size limits)
      const chunkSize = 20 // Most Bluetooth LE devices support 20 bytes per packet
      
      for (let i = 0; i < dataBuffer.length; i += chunkSize) {
        const chunk = dataBuffer.slice(i, i + chunkSize)
        await this.writeCharacteristic.writeValue(chunk)
        
        // Small delay between chunks to prevent overwhelming the printer
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
    } catch (error) {
      throw new Error(`Bluetooth write failed: ${error.message}`)
    }
  }

  // Send data via Network/IP
  async sendNetworkData(data) {
    // For network printers, you would typically use WebSocket or fetch to a local server
    // that handles the raw socket connection to the printer
    return new Promise((resolve, reject) => {
      // Simulate network printing
      setTimeout(() => {
        const success = Math.random() > 0.1
        if (success) {
          console.log('Network print completed')
          resolve()
        } else {
          reject(new Error('Network print failed'))
        }
      }, 1500)
    })
  }

  // Send data via USB
  async sendUSBData(data) {
    if (!navigator.usb) {
      throw new Error('Web USB not supported')
    }
    
    // USB implementation would go here
    // This requires the printer to be connected via USB and proper device permissions
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const success = Math.random() > 0.1
        if (success) {
          console.log('USB print completed')
          resolve()
        } else {
          reject(new Error('USB print failed'))
        }
      }, 1000)
    })
  }

  // Fallback simulation
  async simulatePrint(data) {
    return new Promise((resolve, reject) => {
      const printTime = Math.random() * 2000 + 1000
      setTimeout(() => {
        const success = Math.random() > 0.1
        if (success) {
          console.log('Simulated print completed')
          resolve()
        } else {
          reject(new Error('Simulated print failed'))
        }
      }, printTime)
    })
  }

  // Print invoice
  async printInvoice(invoiceData) {
    if (!this.isConnected) {
      throw new Error('Printer not connected')
    }

    try {
      let printData = this.buildCommand(['INIT', 'RESET'])
      
      // Header
      printData += this.buildCommand(['ALIGN_CENTER', 'SIZE_DOUBLE', 'BOLD_ON'])
      printData += this.formatText(invoiceData.company.name, 'center') + '\n'
      
      printData += this.buildCommand(['SIZE_NORMAL', 'BOLD_OFF'])
      printData += this.formatText(invoiceData.company.address, 'center') + '\n'
      printData += this.formatText(invoiceData.company.phone, 'center') + '\n'
      
      printData += this.buildCommand(['FEED_LINE'])
      printData += this.createSeparator('=') + '\n'
      
      // Invoice details
      printData += this.buildCommand(['ALIGN_LEFT', 'BOLD_ON'])
      printData += this.formatText(`INVOICE #${invoiceData.invoiceNumber}`) + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      printData += this.formatText(`Customer: ${invoiceData.customerName}`) + '\n'
      printData += this.formatText(`Date: ${this.formatDate(invoiceData.date)}`) + '\n'
      
      printData += this.createSeparator('-') + '\n'
      
      // Items
      printData += this.buildCommand(['BOLD_ON'])
      printData += this.formatText('ITEMS:', 'left') + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      invoiceData.items.forEach(item => {
        const itemLine = `${item.name} x${item.quantity}`
        const itemTotal = this.formatCurrency(item.price * item.quantity)
        const maxItemWidth = this.config.paperWidth - itemTotal.length - 1
        
        printData += this.formatText(itemLine, 'left', maxItemWidth)
        printData += ' ' + itemTotal + '\n'
      })
      
      printData += this.createSeparator('-') + '\n'
      
      // Total
      printData += this.buildCommand(['SIZE_DOUBLE_WIDTH', 'BOLD_ON'])
      const totalText = `TOTAL: ${this.formatCurrency(invoiceData.total)}`
      printData += this.formatText(totalText, 'right') + '\n'
      
      printData += this.buildCommand(['SIZE_NORMAL', 'BOLD_OFF'])
      printData += this.createSeparator('=') + '\n'
      
      // Footer
      printData += this.buildCommand(['ALIGN_CENTER'])
      printData += this.formatText('Thank you for your business!', 'center') + '\n'
      
      printData += this.buildCommand(['FEED_LINES'], () => '\n\n\n')
      printData += this.buildCommand(['CUT_PAPER'])
      
      await this.sendToPrinter(printData)
      
    } catch (error) {
      throw new Error(`Invoice print failed: ${error.message}`)
    }
  }

  // Print test page
  async printTestPage() {
    if (!this.isConnected) {
      throw new Error('Printer not connected')
    }

    try {
      let printData = this.buildCommand(['INIT', 'RESET'])
      
      // Test page header
      printData += this.buildCommand(['ALIGN_CENTER', 'SIZE_DOUBLE', 'BOLD_ON'])
      printData += this.formatText('PRINTER TEST', 'center') + '\n'
      
      printData += this.buildCommand(['SIZE_NORMAL', 'BOLD_OFF'])
      printData += this.createSeparator('=') + '\n'
      
      // Printer info
      printData += this.buildCommand(['ALIGN_LEFT'])
      printData += this.formatText(`Printer: ${this.printer.name}`) + '\n'
      printData += this.formatText(`Type: ${this.printer.type.toUpperCase()}`) + '\n'
      printData += this.formatText(`Date: ${this.formatDate(new Date())}`) + '\n'
      
      printData += this.createSeparator('-') + '\n'
      
      // Font tests
      printData += this.buildCommand(['BOLD_ON'])
      printData += this.formatText('FONT TESTS:', 'left') + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      printData += this.formatText('Normal text') + '\n'
      
      printData += this.buildCommand(['BOLD_ON'])
      printData += this.formatText('Bold text') + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      printData += this.buildCommand(['UNDERLINE_ON'])
      printData += this.formatText('Underlined text') + '\n'
      printData += this.buildCommand(['UNDERLINE_OFF'])
      
      printData += this.buildCommand(['SIZE_DOUBLE_WIDTH'])
      printData += this.formatText('Double width', 'center') + '\n'
      printData += this.buildCommand(['SIZE_NORMAL'])
      
      printData += this.createSeparator('-') + '\n'
      
      // Alignment tests
      printData += this.buildCommand(['BOLD_ON'])
      printData += this.formatText('ALIGNMENT TESTS:', 'left') + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      printData += this.formatText('Left aligned', 'left') + '\n'
      printData += this.formatText('Center aligned', 'center') + '\n'
      printData += this.formatText('Right aligned', 'right') + '\n'
      
      printData += this.createSeparator('=') + '\n'
      
      // Success message
      printData += this.buildCommand(['ALIGN_CENTER', 'BOLD_ON'])
      printData += this.formatText('TEST SUCCESSFUL!', 'center') + '\n'
      printData += this.buildCommand(['BOLD_OFF'])
      
      printData += this.buildCommand(['FEED_LINES'], () => '\n\n\n')
      printData += this.buildCommand(['CUT_PAPER'])
      
      await this.sendToPrinter(printData)
      
    } catch (error) {
      throw new Error(`Test print failed: ${error.message}`)
    }
  }

  // Utility function to format dates
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Disconnect printer
  disconnect() {
    // Disconnect Bluetooth if connected
    if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect()
    }
    
    this.printer = null
    this.config = null
    this.isConnected = false
    this.bluetoothDevice = null
    this.gattServer = null
    this.printService = null
    this.writeCharacteristic = null
  }

  // Get printer status
  getStatus() {
    return {
      connected: this.isConnected,
      printer: this.printer,
      config: this.config
    }
  }
}

// Create singleton instance
const thermalPrinterInstance = new ThermalPrinter()

// Export functions for use in Vue components
export const initializePrinter = async (printer, config) => {
  return await thermalPrinterInstance.initialize(printer, config)
}

export const printInvoice = async (invoiceData) => {
  return await thermalPrinterInstance.printInvoice(invoiceData)
}

export const printTestPage = async () => {
  return await thermalPrinterInstance.printTestPage()
}

export const disconnectPrinter = () => {
  thermalPrinterInstance.disconnect()
}

export const getPrinterStatus = () => {
  return thermalPrinterInstance.getStatus()
}

// Export the class for advanced usage
export { ThermalPrinter }

// Default export
export default thermalPrinterInstance