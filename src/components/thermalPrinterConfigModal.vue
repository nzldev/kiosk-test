<!-- ThermalPrinterConfigModal.vue -->
<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Configure Thermal Printer</h3>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <!-- Connection Type Selection -->
        <div class="connection-types">
          <h4>Select Connection Type</h4>
          <div class="type-buttons">
            <button 
              v-for="type in connectionTypes" 
              :key="type.id"
              class="type-btn"
              :class="{ active: connectionType === type.id }"
              @click="selectConnectionType(type.id)"
            >
              <span class="icon">{{ type.icon }}</span>
              <span>{{ type.name }}</span>
            </button>
          </div>
        </div>

        <!-- Bluetooth Configuration -->
        <div v-if="connectionType === 'bluetooth'" class="config-section">
          <h4>Bluetooth Printers</h4>
          
          <div class="scan-section">
            <button 
              class="scan-btn" 
              @click="scanForBluetoothPrinters"
              :disabled="isScanning"
            >
              <span v-if="isScanning" class="spinner-small"></span>
              {{ isScanning ? 'Scanning...' : '🔍 Scan for Printers' }}
            </button>
          </div>

          <div v-if="bluetoothPrinters.length > 0" class="printer-list">
            <div 
              v-for="printer in bluetoothPrinters" 
              :key="printer.id"
              class="printer-item"
              :class="{ selected: selectedPrinter?.id === printer.id }"
              @click="selectPrinter(printer)"
            >
              <div class="printer-info">
                <div class="printer-name">{{ printer.name }}</div>
                <div class="printer-details">
                  <span class="printer-type">Bluetooth</span>
                  <span v-if="printer.batteryLevel" class="battery">
                    🔋 {{ printer.batteryLevel }}%
                  </span>
                </div>
              </div>
              <div class="printer-actions">
                <button 
                  class="test-btn-small"
                  @click.stop="testBluetoothPrinter(printer)"
                  :disabled="testingPrinter === printer.id"
                >
                  {{ testingPrinter === printer.id ? '...' : 'Test' }}
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="!isScanning" class="no-printers">
            <p>No Bluetooth printers found. Make sure your printer is:</p>
            <ul>
              <li>Powered on and in pairing mode</li>
              <li>Within range of your device</li>
              <li>Compatible with Bluetooth LE</li>
            </ul>
          </div>
        </div>

        <!-- IP/Network Configuration -->
        <div v-if="connectionType === 'ip'" class="config-section">
          <h4>Network Printer Settings</h4>
          
          <div class="ip-config">
            <div class="form-group">
              <label>IP Address:</label>
              <input 
                v-model="ipConfig.address" 
                type="text" 
                placeholder="192.168.1.100"
                pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
              >
            </div>
            
            <div class="form-group">
              <label>Port:</label>
              <input 
                v-model.number="ipConfig.port" 
                type="number" 
                placeholder="9100"
                min="1"
                max="65535"
              >
            </div>
            
            <button 
              class="test-ip-btn"
              @click="testIPConnection"
              :disabled="!ipConfig.address || !ipConfig.port || testingIP"
            >
              <span v-if="testingIP" class="spinner-small"></span>
              {{ testingIP ? 'Testing...' : '🔗 Test Connection' }}
            </button>
          </div>
        </div>

        <!-- USB Configuration -->
        <div v-if="connectionType === 'usb'" class="config-section">
          <h4>USB Printers</h4>
          
          <div class="usb-info">
            <p>🔌 Connect your thermal printer via USB and click scan.</p>
            <p><small>Note: Web USB requires HTTPS and user permission.</small></p>
          </div>
          
          <button 
            class="scan-btn" 
            @click="scanForUSBPrinters"
            :disabled="isScanning"
          >
            <span v-if="isScanning" class="spinner-small"></span>
            {{ isScanning ? 'Scanning...' : '🔍 Scan USB Ports' }}
          </button>

          <div v-if="usbPrinters.length > 0" class="printer-list">
            <div 
              v-for="printer in usbPrinters" 
              :key="printer.id"
              class="printer-item"
              :class="{ selected: selectedPrinter?.id === printer.id }"
              @click="selectPrinter(printer)"
            >
              <div class="printer-info">
                <div class="printer-name">{{ printer.name }}</div>
                <div class="printer-details">
                  <span class="printer-type">USB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Options -->
        <div v-if="selectedPrinter" class="config-section">
          <h4>Printer Settings</h4>
          
          <div class="settings-grid">
            <div class="form-group">
              <label>Paper Width (characters):</label>
              <select v-model.number="printerConfig.paperWidth">
                <option value="32">32 characters (58mm)</option>
                <option value="48">48 characters (80mm)</option>
                <option value="64">64 characters (110mm)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Encoding:</label>
              <select v-model="printerConfig.encoding">
                <option value="utf8">UTF-8</option>
                <option value="ascii">ASCII</option>
                <option value="cp1252">CP1252</option>
              </select>
            </div>
            
            <div v-if="connectionType !== 'bluetooth'" class="form-group">
              <label>Baud Rate:</label>
              <select v-model.number="printerConfig.baudRate">
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="115200">115200</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="closeModal">Cancel</button>
        <button 
          class="configure-btn"
          @click="configurePrinter"
          :disabled="!selectedPrinter || isConfiguring"
        >
          <span v-if="isConfiguring" class="spinner-small"></span>
          {{ isConfiguring ? 'Configuring...' : '✓ Configure Printer' }}
        </button>
      </div>

      <!-- Status Messages -->
      <div v-if="statusMessage" class="status-message" :class="statusType">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { scanBluetoothPrinters, testBluetoothConnection } from '../utils/bluetoothPrinter.js'

// Props
const props = defineProps({
  visible: Boolean,
  isScanning: Boolean,
  availablePrinters: Array,
  selectedPrinter: Object,
  connectionType: String
})

// Emits
const emit = defineEmits([
  'close',
  'scan-printers',
  'configure-printer',
  'update-connection-type',
  'select-printer',
  'test-ip-printer'
])

// Reactive data
const isScanning = ref(false)
const testingPrinter = ref(null)
const testingIP = ref(false)
const isConfiguring = ref(false)
const statusMessage = ref('')
const statusType = ref('info')

const selectedPrinter = ref(null)
const connectionType = ref('bluetooth')

const bluetoothPrinters = ref([])
const usbPrinters = ref([])

// Configuration objects
const ipConfig = reactive({
  address: '192.168.1.100',
  port: 9100
})

const printerConfig = reactive({
  paperWidth: 48,
  encoding: 'utf8',
  baudRate: 9600
})

// Connection types
const connectionTypes = [
  { id: 'bluetooth', name: 'Bluetooth', icon: '📱' },
  { id: 'ip', name: 'Network (IP)', icon: '🌐' },
  { id: 'usb', name: 'USB', icon: '🔌' }
]

// Methods
const closeModal = () => {
  emit('close')
  clearStatus()
}

const selectConnectionType = (type) => {
  connectionType.value = type
  selectedPrinter.value = null
  bluetoothPrinters.value = []
  usbPrinters.value = []
  clearStatus()
  emit('update-connection-type', type)
}

const selectPrinter = (printer) => {
  selectedPrinter.value = printer
  emit('select-printer', printer)
}

const showStatus = (message, type = 'info') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    clearStatus()
  }, 5000)
}

const clearStatus = () => {
  statusMessage.value = ''
  statusType.value = 'info'
}

// Bluetooth methods
const scanForBluetoothPrinters = async () => {
  isScanning.value = true
  bluetoothPrinters.value = []
  clearStatus()
  
  try {
    const printer = await scanBluetoothPrinters()
    bluetoothPrinters.value = [printer]
    showStatus(`Found printer: ${printer.name}`, 'success')
  } catch (error) {
    showStatus(error.message, 'error')
    console.error('Bluetooth scan error:', error)
  } finally {
    isScanning.value = false
  }
}

const testBluetoothPrinter = async (printer) => {
  testingPrinter.value = printer.id
  
  try {
    const result = await testBluetoothConnection(printer.device)
    if (result.success) {
      showStatus('Bluetooth connection test successful!', 'success')
    } else {
      showStatus(result.message, 'error')
    }
  } catch (error) {
    showStatus(`Test failed: ${error.message}`, 'error')
  } finally {
    testingPrinter.value = null
  }
}

// IP methods
const testIPConnection = async () => {
  testingIP.value = true
  clearStatus()
  
  try {
    const printer = await emit('test-ip-printer', ipConfig.address, ipConfig.port)
    selectedPrinter.value = printer
    showStatus('IP connection test successful!', 'success')
  } catch (error) {
    showStatus(`IP test failed: ${error.message}`, 'error')
  } finally {
    testingIP.value = false
  }
}

// USB methods
const scanForUSBPrinters = async () => {
  isScanning.value = true
  usbPrinters.value = []
  clearStatus()
  
  try {
    if (!navigator.usb) {
      throw new Error('Web USB not supported in this browser')
    }
    
    const device = await navigator.usb.requestDevice({
      filters: [
        { classCode: 7 }, // Printer class
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0483 }  // Star
      ]
    })
    
    const printer = {
      id: `usb_${device.serialNumber || Date.now()}`,
      name: `${device.manufacturerName || 'Unknown'} ${device.productName || 'USB Printer'}`,
      type: 'usb',
      device: device
    }
    
    usbPrinters.value = [printer]
    showStatus(`Found USB printer: ${printer.name}`, 'success')
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      showStatus('No USB printer selected or found', 'warning')
    } else {
      showStatus(`USB scan failed: ${error.message}`, 'error')
    }
  } finally {
    isScanning.value = false
  }
}

// Configure printer
const configurePrinter = async () => {
  if (!selectedPrinter.value) return
  
  isConfiguring.value = true
  clearStatus()
  
  try {
    const config = {
      ...printerConfig,
      ...(connectionType.value === 'ip' ? ipConfig : {})
    }
    
    await emit('configure-printer', selectedPrinter.value, config)
    showStatus('Printer configured successfully!', 'success')
    
    setTimeout(() => {
      closeModal()
    }, 1500)
    
  } catch (error) {
    showStatus(`Configuration failed: ${error.message}`, 'error')
  } finally {
    isConfiguring.value = false
  }
}

// Watch for prop changes
watch(() => props.connectionType, (newType) => {
  connectionType.value = newType
})

watch(() => props.selectedPrinter, (newPrinter) => {
  selectedPrinter.value = newPrinter
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-content {
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  border-radius: 20px;
  width: 90%;
  max-width: 650px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: slideUp 0.3s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  position: relative;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  pointer-events: none;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: white;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg) scale(1.1);
}

.modal-body {
  padding: 30px;
  background: white;
  overflow-y: auto;
  max-height: calc(90vh - 180px);
}

.connection-type-section h3,
.ip-config-section h3,
.printers-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
  position: relative;
  padding-bottom: 10px;
}

.connection-type-section h3::after,
.ip-config-section h3::after,
.printers-section h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
}

.connection-options {
  display: flex;
  gap: 20px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.connection-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  position: relative;
  overflow: hidden;
}

.connection-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent);
  transition: left 0.5s ease;
}

.connection-option:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.connection-option:hover::before {
  left: 100%;
}

.connection-option input[type="radio"] {
  margin: 0;
  transform: scale(1.2);
  accent-color: #667eea;
}

.connection-option input[type="radio"]:checked ~ .option-icon {
  transform: scale(1.3);
  filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5));
}

.option-icon {
  font-size: 24px;
  transition: all 0.3s ease;
}

.ip-config-section {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 25px;
  border-radius: 15px;
  margin-bottom: 25px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  position: relative;
  overflow: hidden;
}

.ip-config-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.ip-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: end;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.input-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.input-group input {
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: white;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Enhanced Button Styles */
.test-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  height: fit-content;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
  position: relative;
  overflow: hidden;
}

.test-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.test-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.test-btn:hover::before {
  left: 100%;
}

.test-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #495057);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.scan-section {
  text-align: center;
  margin: 30px 0;
}

.scan-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  min-width: 220px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
  position: relative;
  overflow: hidden;
}

.scan-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.scan-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
}

.scan-btn:hover::before {
  left: 100%;
}

.scan-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #495057);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.printers-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.printer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  position: relative;
  overflow: hidden;
}

.printer-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #667eea, #764ba2);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.printer-item:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.printer-item:hover::before {
  transform: scaleY(1);
}

.printer-item.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f0f4ff, #e6efff);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

.printer-item.selected::before {
  transform: scaleY(1);
}

.printer-info {
  flex: 1;
}

.printer-name {
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 6px;
  font-size: 16px;
}

.printer-type {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  margin-bottom: 4px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.printer-address {
  font-size: 13px;
  color: #95a5a6;
  font-family: 'Courier New', monospace;
}

.status-indicator {
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-indicator.connected {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border: 1px solid #b8dacd;
}

.status-indicator.disconnected {
  background: linear-gradient(135deg, #f8d7da, #f1b0b7);
  color: #721c24;
  border: 1px solid #f1b2b5;
}

.no-printers {
  text-align: center;
  color: #6c757d;
  margin: 40px 0;
  padding: 30px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  border: 2px dashed #dee2e6;
}

.no-printers ul {
  text-align: left;
  display: inline-block;
  margin-top: 15px;
}

.error-message {
  background: linear-gradient(135deg, #f8d7da, #f1b0b7);
  color: #721c24;
  padding: 16px 20px;
  border-radius: 10px;
  margin: 20px 0;
  border: 1px solid #f1b2b5;
  font-weight: 500;
  position: relative;
}

.error-message::before {
  content: '⚠️';
  margin-right: 10px;
  font-size: 18px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 25px 30px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.cancel-btn {
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
  position: relative;
  overflow: hidden;
}

.cancel-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
}

.cancel-btn:hover::before {
  left: 100%;
}

.configure-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
  position: relative;
  overflow: hidden;
}

.configure-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.configure-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.configure-btn:hover::before {
  left: 100%;
}

.configure-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #495057);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.connection-option:disabled,
.connection-option input[type="radio"]:disabled ~ * {
  opacity: 0.5;
  cursor: not-allowed;
}

.connection-option input[type="radio"]:disabled {
  cursor: not-allowed;
}

.not-supported {
  color: #dc3545;
  font-size: 10px;
  font-weight: 500;
  display: block;
  margin-top: 2px;
}

.recommended {
  color: #28a745;
  font-size: 10px;
  font-weight: 500;
  display: block;
  margin-top: 2px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.scan-btn:disabled::after,
.test-btn:disabled::after {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 8px;
}

@media (max-width: 600px) {
  .connection-options {
    flex-direction: column;
  }
  
  .ip-inputs {
    flex-direction: column;
    align-items: stretch;
  }
  
  .modal-content {
    width: 95%;
    margin: 10px;
    border-radius: 15px;
  }
  
  .modal-header {
    padding: 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-footer {
    padding: 20px;
    flex-direction: column;
  }
  
  .cancel-btn,
  .configure-btn {
    width: 100%;
  }
}
</style>