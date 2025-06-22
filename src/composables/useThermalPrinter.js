// composables/useThermalPrinter.js
import { ref, reactive, computed } from 'vue'

// Global state for thermal printer
const state = reactive({
  configuredPrinter: null,
  availablePrinters: [],
  selectedPrinter: null,
  connectionType: 'ip',
  isScanning: false,
  printQueue: [],
  connectionStatus: 'disconnected',
  lastError: null
})

// Print queue item statuses
const PRINT_STATUS = {
  PENDING: 'pending',
  PRINTING: 'printing',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

export function useThermalPrinter() {
  // Reactive references
  const configuredPrinter = computed(() => state.configuredPrinter)
  const availablePrinters = computed(() => state.availablePrinters)
  const selectedPrinter = computed(() => state.selectedPrinter)
  const connectionType = computed(() => state.connectionType)
  const isScanning = computed(() => state.isScanning)
  const printQueue = computed(() => state.printQueue)
  const isPrinterReady = computed(() => 
    state.configuredPrinter && state.connectionStatus === 'connected'
  )

  // Initialize printer system
  const initializePrinter = async () => {
    try {
      // Load saved printer configuration
      const savedConfig = localStorage.getItem('thermalPrinterConfig')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        state.configuredPrinter = config.printer
        state.connectionType = config.connectionType
        
        // Attempt to reconnect
        await connectToPrinter(config.printer, config.additionalConfig)
      }
    } catch (error) {
      console.warn('Failed to initialize saved printer:', error)
      state.lastError = error.message
    }
  }

  // Save thermal printer configuration
const saveThermalPrinterConfig = (config) => {
  try {
    localStorage.setItem('thermalPrinterConfig', JSON.stringify(config))
    printerConfig.value = config
    showThermalPrinterModal.value = false
  } catch (error) {
    console.error('Error saving thermal printer config:', error)
  }
}

  // Update connection type
  const updateConnectionType = (type) => {
    state.connectionType = type
    state.selectedPrinter = null
    state.availablePrinters = []
  }

  // Select printer
  const selectPrinter = (printer) => {
    state.selectedPrinter = printer
  }

  // Scan for available printers
  const scanPrinters = async () => {
    state.isScanning = true
    state.availablePrinters = []
    
    try {
      switch (state.connectionType) {
        case 'bluetooth':
          await scanBluetoothPrinters()
          break
        case 'usb':
          await scanUSBPrinters()
          break
        case 'serial':
          await scanSerialPrinters()
          break
        default:
          // IP printers are handled differently (manual entry)
          break
      }
    } catch (error) {
      state.lastError = error.message
      throw error
    } finally {
      state.isScanning = false
    }
  }

  // Scan Bluetooth printers
const scanBluetoothPrinters = async () => {
     try {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported')
    }
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Print service
        { namePrefix: 'POS' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'Receipt' }
      ],
      optionalServices: ['battery_service']
    })
    
    return {
      id: device.id,
      name: device.name || 'Unknown Bluetooth Printer',
      type: 'bluetooth',
      device: device
    }
  } catch (error) {
    console.error('Bluetooth scan error:', error)
    throw error
  }
}

// Scan for USB printers
const scanUSBPrinters = async () => {
  try {
    if (!navigator.usb) {
      throw new Error('USB not supported')
    }
    
    const device = await navigator.usb.requestDevice({
      filters: [
        { classCode: 7 }, // Printer class
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x04da }, // Panasonic
        { vendorId: 0x0483 }  // STMicroelectronics
      ]
    })
    
    return {
      id: device.serialNumber || Math.random().toString(36),
      name: device.productName || 'USB Thermal Printer',
      type: 'usb',
      device: device
    }
  } catch (error) {
    console.error('USB scan error:', error)
    throw error
  }
}
 

}