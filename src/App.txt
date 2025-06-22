<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
 import ThermalPrinterConfigModal from '@/components/thermalPrinterConfigModal.vue';

const showThermalPrinterModal = ref(false)
const printerConfig = ref(null)

// Printer scanning states
const isScanning = ref(false)
const availablePrinters = ref([])
const selectedPrinter = ref(null)
const connectionType = ref('bluetooth') // bluetooth, usb, ip

// Check thermal printer configuration
const checkThermalPrinterConfig = () => {
  try {
    const config = localStorage.getItem('thermalPrinterConfig')
    if (config) {
      printerConfig.value = JSON.parse(config)
      return true
    }
    return false
  } catch (error) {
    console.error('Error reading thermal printer config:', error)
    return false
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

// Scan for Bluetooth printers
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


// Scan for printers based on connection type
const scanPrinters = async () => {
  isScanning.value = true
  availablePrinters.value = []
  
  try {
    let printers = []
    
    if (connectionType.value === 'bluetooth') {
      const printer = await scanBluetoothPrinters()
      printers = [printer]
    } else if (connectionType.value === 'usb') {
      const printer = await scanUSBPrinters()
      printers = [printer]
    } else if (connectionType.value === 'ip') {
      // For IP, we'll need user input for IP address
      // This is handled in the modal component
      return
    }
    
    availablePrinters.value = printers
  } catch (error) {
    console.error('Printer scan failed:', error)
    // Show error message to user
  } finally {
    isScanning.value = false
  }
}

// Configure selected printer
const configurePrinter = async (printer, additionalConfig = {}) => {
  const config = {
    id: printer.id,
    name: printer.name,
    type: printer.type,
    connected: true,
    connectedAt: new Date().toISOString(),
    ...additionalConfig
  }
  
  if (printer.type === 'bluetooth') {
    config.deviceId = printer.device.id
  } else if (printer.type === 'usb') {
    config.vendorId = printer.device.vendorId
    config.productId = printer.device.productId
  } else if (printer.type === 'ip') {
    config.address = printer.address
    config.port = printer.port
  }
  
  saveThermalPrinterConfig(config)
}


onMounted(async () => {
  // Check thermal printer configuration first
  const hasConfig = checkThermalPrinterConfig()
  
  if (!hasConfig) {
    // Show thermal printer config modal
    showThermalPrinterModal.value = true
  }
  
  
})


</script>

<template>
   
  <HelloWorld />
  <TheWelcome/>
  <!-- Thermal Printer Configuration Modal -->
  <ThermalPrinterConfigModal
    :visible="showThermalPrinterModal"
    :is-scanning="isScanning"
    :available-printers="availablePrinters"
    :selected-printer="selectedPrinter"
    :connection-type="connectionType"
    @close="showThermalPrinterModal = false"
    @scan-printers="scanPrinters"
    @configure-printer="configurePrinter"
    @update-connection-type="connectionType = $event"
    @select-printer="selectedPrinter = $event"
    @test-ip-printer="testIPPrinter"
  />
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
