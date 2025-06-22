// bluetoothPrinter.js
// Bluetooth Printer Utility Functions

export const scanBluetoothPrinters = async () => {
  try {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported in this browser')
    }
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Standard print service
        { namePrefix: 'POS' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'Receipt' },
        { namePrefix: 'Printer' }
      ],
      optionalServices: [
        'battery_service',
        '000018f0-0000-1000-8000-00805f9b34fb' // Print service
      ]
    })
    
    return {
      id: device.id,
      name: device.name || 'Unknown Bluetooth Printer',
      type: 'bluetooth',
      device: device, // Store the actual device object
      connected: false
    }
  } catch (error) {
    console.error('Bluetooth scan error:', error)
    
    if (error.name === 'NotFoundError') {
      throw new Error('No Bluetooth printer found or user cancelled selection')
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Bluetooth not supported on this device')
    } else if (error.name === 'SecurityError') {
      throw new Error('Bluetooth access denied. Please allow Bluetooth permissions.')
    } else {
      throw new Error(`Bluetooth error: ${error.message}`)
    }
  }
}

export const getBluetoothPrinterInfo = async (device) => {
  try {
    if (!device || !device.gatt) {
      throw new Error('Invalid Bluetooth device')
    }
    
    const server = await device.gatt.connect()
    
    // Try to get device information
    let batteryLevel = null
    try {
      const batteryService = await server.getPrimaryService('battery_service')
      const batteryCharacteristic = await batteryService.getCharacteristic('battery_level')
      const batteryValue = await batteryCharacteristic.readValue()
      batteryLevel = batteryValue.getUint8(0)
    } catch (e) {
      // Battery service not available
    }
    
    const info = {
      name: device.name || 'Unknown',
      id: device.id,
      connected: device.gatt.connected,
      batteryLevel: batteryLevel
    }
    
    await server.disconnect()
    return info
    
  } catch (error) {
    console.error('Failed to get printer info:', error)
    return {
      name: device.name || 'Unknown',
      id: device.id,
      connected: false,
      batteryLevel: null
    }
  }
}

export const testBluetoothConnection = async (device) => {
  try {
    if (!device || !device.gatt) {
      throw new Error('Invalid Bluetooth device')
    }
    
    // Test connection
    const server = await device.gatt.connect()
    
    // Try to access print service
    const printService = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
    const writeCharacteristic = await printService.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')
    
    // Send a simple test command (initialize printer)
    const testData = new TextEncoder().encode('\x1B@') // ESC @ (initialize)
    await writeCharacteristic.writeValue(testData)
    
    await server.disconnect()
    
    return {
      success: true,
      message: 'Bluetooth connection test successful'
    }
    
  } catch (error) {
    console.error('Bluetooth connection test failed:', error)
    return {
      success: false,
      message: `Connection test failed: ${error.message}`
    }
  }
}

// Common Bluetooth printer service UUIDs
export const BLUETOOTH_PRINTER_SERVICES = {
  PRINT_SERVICE: '000018f0-0000-1000-8000-00805f9b34fb',
  WRITE_CHARACTERISTIC: '00002af1-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE: 'battery_service',
  BATTERY_LEVEL: 'battery_level'
}

// Alternative service UUIDs for different printer brands
export const ALTERNATIVE_SERVICES = [
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Some Chinese printers
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Another common service
]

export default {
  scanBluetoothPrinters,
  getBluetoothPrinterInfo,
  testBluetoothConnection,
  BLUETOOTH_PRINTER_SERVICES,
  ALTERNATIVE_SERVICES
}