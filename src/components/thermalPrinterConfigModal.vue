 <!-- components/thermalPrinterConfigModal.vue -->
<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Configure Thermal Printer</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Connection Type Selection -->
        <div class="connection-type-section">
          <h3>Select Connection Type</h3>
          <div class="connection-options">
            <label class="connection-option">
              <input 
                type="radio" 
                value="bluetooth" 
                :checked="connectionType === 'bluetooth'"
                @change="$emit('update-connection-type', 'bluetooth')"
                :disabled="!bluetoothSupported"
              />
              <span class="option-icon">📶</span>
              <span>Bluetooth</span>
              <small v-if="!bluetoothSupported" class="not-supported">(Not Supported)</small>
            </label>
            
            <label class="connection-option">
              <input 
                type="radio" 
                value="usb" 
                :checked="connectionType === 'usb'"
                @change="$emit('update-connection-type', 'usb')"
                :disabled="!usbSupported"
              />
              <span class="option-icon">🔌</span>
              <span>USB</span>
              <small v-if="!usbSupported" class="not-supported">(Not Supported)</small>
            </label>
            
            <label class="connection-option">
              <input 
                type="radio" 
                value="ip" 
                :checked="connectionType === 'ip'"
                @change="$emit('update-connection-type', 'ip')"
              />
              <span class="option-icon">🌐</span>
              <span>Network/IP</span>
              <small class="recommended">(Recommended)</small>
            </label>

            <!-- <label class="connection-option">
              <input 
                type="radio" 
                value="serial" 
                :checked="connectionType === 'serial'"
                @change="$emit('update-connection-type', 'serial')"
                :disabled="!serialSupported"
              />
              <span class="option-icon">⚡</span>
              <span>Serial Port</span>
              <small v-if="!serialSupported" class="not-supported">(Not Supported)</small>
            </label> -->
          </div>
        </div>

        <!-- IP Configuration (shown only for IP connection) -->
        <div v-if="connectionType === 'ip'" class="ip-config-section">
          <h3>Network Printer Configuration</h3>
          <div class="ip-inputs">
            <div class="input-group">
              <label>IP Address:</label>
              <input 
                type="text" 
                v-model="ipAddress" 
                placeholder="192.168.1.100"
                pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
              />
            </div>
            <div class="input-group">
              <label>Port:</label>
              <input 
                type="number" 
                v-model.number="ipPort" 
                placeholder="9100"
                min="1"
                max="65535"
              />
            </div>
            <button 
              class="test-btn" 
              @click="testIPConnection"
              :disabled="!ipAddress || isTestingIP"
            >
              {{ isTestingIP ? 'Testing...' : 'Test Connection' }}
            </button>
          </div>
        </div>

        <!-- Scan Section -->
        <div v-if="connectionType !== 'ip'" class="scan-section">
          <button 
            class="scan-btn" 
            @click="$emit('scan-printers')"
            :disabled="isScanning"
          >
            {{ isScanning ? 'Scanning...' : `Scan ${connectionType.toUpperCase()} Printers` }}
          </button>
        </div>

        <!-- Available Printers -->
        <div v-if="availablePrinters.length > 0 || ipTestResult" class="printers-section">
          <h3>Available Printers</h3>
          <div class="printers-list">
            <div 
              v-for="printer in displayPrinters" 
              :key="printer.id"
              class="printer-item"
              :class="{ 'selected': selectedPrinter?.id === printer.id }"
              @click="$emit('select-printer', printer)"
            >
              <div class="printer-info">
                <div class="printer-name">{{ printer.name }}</div>
                <div class="printer-type">{{ printer.type.toUpperCase() }}</div>
                <div v-if="printer.address" class="printer-address">
                  {{ printer.address }}:{{ printer.port }}
                </div>
              </div>
              <div class="printer-status">
                <span class="status-indicator" :class="printer.connected ? 'connected' : 'disconnected'">
                  {{ printer.connected ? 'Connected' : 'Disconnected' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- No Printers Found -->
        <div v-if="!isScanning && availablePrinters.length === 0 && !ipTestResult && scanAttempted" class="no-printers">
          <p>No printers found. Please ensure your printer is:</p>
          <ul>
            <li v-if="connectionType === 'bluetooth'">Powered on and in pairing mode</li>
            <li v-if="connectionType === 'usb'">Connected via USB cable</li>
            <li v-if="connectionType === 'ip'">Connected to the same network</li>
            <li>Compatible with your device</li>
          </ul>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button 
          class="configure-btn" 
          @click="configurePrinter"
          :disabled="!selectedPrinter"
        >
          Configure Printer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  isScanning: Boolean,
  availablePrinters: Array,
  selectedPrinter: Object,
  connectionType: String
})

const emit = defineEmits([
  'close', 
  'scan-printers', 
  'configure-printer', 
  'update-connection-type', 
  'select-printer',
  'test-ip-printer'
])

const ipAddress = ref(null)
const ipPort = ref(9100)
const isTestingIP = ref(false)
const ipTestResult = ref(null)
const errorMessage = ref('')
const scanAttempted = ref(false)
const bluetoothSupported = ref(false)
const usbSupported = ref(false)
// const serialSupported = ref(false)

const displayPrinters = computed(() => {
  if (ipTestResult.value) {
    return [ipTestResult.value, ...props.availablePrinters]
  }
  return props.availablePrinters
})

// Check API support on component mount
onMounted(() => {
  bluetoothSupported.value = !!navigator.bluetooth && location.protocol === 'https:'
  usbSupported.value = !!navigator.usb
//   serialSupported.value = !!navigator.serial
  
  // Auto-select IP if Bluetooth is not supported
  if (!bluetoothSupported.value && props.connectionType === 'bluetooth') {
    emit('update-connection-type', 'ip')
  }
})

  

const testIPConnection = async () => {
  if (!ipAddress.value) return
  
  isTestingIP.value = true
  errorMessage.value = ''
  
  try {
    const result = await emit('test-ip-printer', ipAddress.value, ipPort.value)
    ipTestResult.value = result
    emit('select-printer', result)
  } catch (error) {
    errorMessage.value = `Failed to connect to ${ipAddress.value}:${ipPort.value}. Please check the IP address and ensure the printer is accessible.`
    ipTestResult.value = null
  } finally {
    isTestingIP.value = false
  }
}

const configurePrinter = () => {
  if (!props.selectedPrinter) return
  
  const additionalConfig = {}
  if (props.connectionType === 'ip') {
    additionalConfig.address = ipAddress.value
    additionalConfig.port = ipPort.value
  }
  
  emit('configure-printer', props.selectedPrinter, additionalConfig)
}

// Watch for scan attempts
watch(() => props.isScanning, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    scanAttempted.value = true
  }
})

// Reset state when connection type changes
watch(() => props.connectionType, () => {
  ipTestResult.value = null
  errorMessage.value = ''
  scanAttempted.value = false
  emit('select-printer', null)
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