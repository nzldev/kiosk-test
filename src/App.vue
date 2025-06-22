<!-- App.vue -->
<template>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <h1>POS Thermal Printer System</h1>
      <div class="printer-status">
        <span class="status-indicator" :class="printerConnected ? 'connected' : 'disconnected'">
          {{ printerConnected ? '🟢 Printer Connected' : '🔴 No Printer' }}
        </span>
        <button 
          class="config-btn" 
          @click="showPrinterConfig = true"
          :class="{ 'pulse': !printerConnected }"
        >
          ⚙️ Configure Printer
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Demo Invoice Form -->
      <div class="invoice-demo">
        <h2>Invoice Demo</h2>
        <form @submit.prevent="printDemoInvoice" class="invoice-form">
          <div class="form-row">
            <div class="form-group">
              <label>Customer Name:</label>
              <input v-model="demoInvoice.customerName" type="text" required>
            </div>
            <div class="form-group">
              <label>Invoice #:</label>
              <input v-model="demoInvoice.invoiceNumber" type="text" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>Items:</label>
            <div class="items-list">
              <div v-for="(item, index) in demoInvoice.items" :key="index" class="item-row">
                <input v-model="item.name" placeholder="Item name" required>
                <input v-model.number="item.quantity" type="number" min="1" placeholder="Qty" required>
                <input v-model.number="item.price" type="number" step="0.01" placeholder="Price" required>
                <button type="button" @click="removeItem(index)" class="remove-btn">❌</button>
              </div>
              <button type="button" @click="addItem" class="add-item-btn">+ Add Item</button>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" :disabled="!printerConnected || isPrinting" class="print-btn">
              {{ isPrinting ? 'Printing...' : '🖨️ Print Invoice' }}
            </button>
            <button type="button" @click="printTestPage" :disabled="!printerConnected" class="test-btn">
              📄 Test Print
            </button>
          </div>
        </form>

        <!-- Invoice Preview -->
        <div class="invoice-preview">
          <h3>Preview</h3>
          <div class="preview-content">
            <div class="preview-header">
              <strong>{{ companyInfo.name }}</strong><br>
              {{ companyInfo.address }}<br>
              {{ companyInfo.phone }}
            </div>
            <hr>
            <div class="preview-details">
              <strong>Invoice #: {{ demoInvoice.invoiceNumber }}</strong><br>
              Customer: {{ demoInvoice.customerName }}<br>
              Date: {{ formatDate(new Date()) }}
            </div>
            <hr>
            <div class="preview-items">
              <div v-for="item in demoInvoice.items" :key="item.name" class="preview-item">
                {{ item.name }} x{{ item.quantity }} - ${{ (item.price * item.quantity).toFixed(2) }}
              </div>
            </div>
            <hr>
            <div class="preview-total">
              <strong>Total: ${{ calculateTotal().toFixed(2) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Print History -->
      <div class="print-history">
        <h3>Recent Prints</h3>
        <div v-if="printHistory.length === 0" class="no-history">
          No print history yet
        </div>
        <div v-else class="history-list">
          <div v-for="print in printHistory" :key="print.id" class="history-item">
            <div class="history-info">
              <strong>{{ print.type }}</strong>
              <span class="history-time">{{ formatDate(print.timestamp) }}</span>
            </div>
            <div class="history-status" :class="print.status">
              {{ print.status }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Thermal Printer Configuration Modal -->
    <ThermalPrinterConfigModal
      :visible="showPrinterConfig"
      :is-scanning="isScanning"
      :available-printers="availablePrinters"
      :selected-printer="selectedPrinter"
      :connection-type="connectionType"
      @close="showPrinterConfig = false"
      @scan-printers="scanPrinters"
      @configure-printer="configurePrinter"
      @update-connection-type="updateConnectionType"
      @select-printer="selectPrinter"
      @test-ip-printer="testIPPrinter"
    />

    <!-- Loading Overlay -->
    <div v-if="isPrinting" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>Printing...</p>
      </div>
    </div>

    <!-- Notifications -->
    <div class="notifications">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import ThermalPrinterConfigModal from './components/thermalPrinterConfigModal.vue'
import { printInvoice, printTestPage as printTest, initializePrinter } from './utils/thermalPrinter.js'

// Reactive data
const showPrinterConfig = ref(false)
const printerConnected = ref(false)
const isPrinting = ref(false)
const isScanning = ref(false)
const connectionType = ref('ip')
const availablePrinters = ref([])
const selectedPrinter = ref(null)
const notifications = ref([])
const printHistory = ref([])

// Company information
const companyInfo = reactive({
  name: 'Your Business Name',
  address: '123 Main St, City, State 12345',
  phone: 'Tel: (555) 123-4567'
})

// Demo invoice data
const demoInvoice = reactive({
  customerName: 'John Doe',
  invoiceNumber: 'INV-001',
  items: [
    { name: 'Coffee', quantity: 2, price: 3.50 },
    { name: 'Sandwich', quantity: 1, price: 8.99 }
  ]
})

// Computed properties
const calculateTotal = () => {
  return demoInvoice.items.reduce((total, item) => {
    return total + (item.quantity * item.price)
  }, 0)
}

// Methods
const addItem = () => {
  demoInvoice.items.push({ name: '', quantity: 1, price: 0 })
}

const removeItem = (index) => {
  demoInvoice.items.splice(index, 1)
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const showNotification = (message, type = 'info') => {
  const id = Date.now()
  notifications.value.push({ id, message, type })
  
  setTimeout(() => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) notifications.value.splice(index, 1)
  }, 5000)
}

const addToPrintHistory = (type, status = 'success') => {
  printHistory.value.unshift({
    id: Date.now(),
    type,
    status,
    timestamp: new Date()
  })
  
  // Keep only last 10 entries
  if (printHistory.value.length > 10) {
    printHistory.value = printHistory.value.slice(0, 10)
  }
}

// Printer management methods
const updateConnectionType = (type) => {
  connectionType.value = type
  availablePrinters.value = []
  selectedPrinter.value = null
}

const selectPrinter = (printer) => {
  selectedPrinter.value = printer
}

const scanPrinters = async () => {
  isScanning.value = true
  availablePrinters.value = []
  
  try {
    // Simulate scanning based on connection type
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (connectionType.value === 'bluetooth') {
      availablePrinters.value = [
        { id: 'bt1', name: 'Thermal Printer BT', type: 'bluetooth', connected: false }
      ]
    } else if (connectionType.value === 'usb') {
      availablePrinters.value = [
        { id: 'usb1', name: 'USB Thermal Printer', type: 'usb', connected: false }
      ]
    }
    
    showNotification(`Found ${availablePrinters.value.length} printer(s)`, 'success')
  } catch (error) {
    showNotification('Failed to scan for printers', 'error')
  } finally {
    isScanning.value = false
  }
}

const testIPPrinter = async (address, port) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate IP test
      const isReachable = Math.random() > 0.3 // 70% success rate for demo
      
      if (isReachable) {
        const printer = {
          id: `ip_${address}_${port}`,
          name: `Network Printer (${address})`,
          type: 'ip',
          address,
          port,
          connected: true
        }
        resolve(printer)
      } else {
        reject(new Error('Connection failed'))
      }
    }, 1500)
  })
}

const configurePrinter = async (printer, config) => {
  try {
    // Initialize printer connection
    await initializePrinter(printer, config)
    
    selectedPrinter.value = printer
    printerConnected.value = true
    showPrinterConfig.value = false
    
    showNotification(`Printer "${printer.name}" configured successfully`, 'success')
  } catch (error) {
    showNotification(`Failed to configure printer: ${error.message}`, 'error')
  }
}

// Print methods
const printDemoInvoice = async () => {
  if (!printerConnected.value) {
    showNotification('Please configure a printer first', 'warning')
    return
  }

  isPrinting.value = true
  
  try {
    const invoiceData = {
      company: companyInfo,
      invoiceNumber: demoInvoice.invoiceNumber,
      customerName: demoInvoice.customerName,
      date: new Date(),
      items: demoInvoice.items,
      total: calculateTotal()
    }
    
    await printInvoice(invoiceData)
    
    showNotification('Invoice printed successfully', 'success')
    addToPrintHistory(`Invoice ${demoInvoice.invoiceNumber}`, 'success')
    
    // Generate next invoice number
    const num = parseInt(demoInvoice.invoiceNumber.split('-')[1]) + 1
    demoInvoice.invoiceNumber = `INV-${num.toString().padStart(3, '0')}`
    
  } catch (error) {
    showNotification(`Print failed: ${error.message}`, 'error')
    addToPrintHistory(`Invoice ${demoInvoice.invoiceNumber}`, 'failed')
  } finally {
    isPrinting.value = false
  }
}

const printTestPage = async () => {
  if (!printerConnected.value) {
    showNotification('Please configure a printer first', 'warning')
    return
  }

  isPrinting.value = true
  
  try {
    await printTest()
    showNotification('Test page printed successfully', 'success')
    addToPrintHistory('Test Page', 'success')
  } catch (error) {
    showNotification(`Test print failed: ${error.message}`, 'error')
    addToPrintHistory('Test Page', 'failed')
  } finally {
    isPrinting.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Auto-show printer config if no printer is connected
  setTimeout(() => {
    if (!printerConnected.value) {
      showNotification('Please configure your thermal printer to start printing', 'info')
    }
  }, 1000)
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #2c3e50;
}

.app-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(20px);
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.printer-status {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-indicator {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
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

.config-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

.config-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

.config-btn.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); }
  50% { box-shadow: 0 6px 25px rgba(0, 123, 255, 0.6); }
  100% { box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); }
}

.main-content {
  padding: 30px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.invoice-demo {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.invoice-demo h2 {
  margin: 0 0 25px 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.invoice-form {
  margin-bottom: 30px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-row {
  display: grid;
  grid-template-columns: 2fr 80px 100px 40px;
  gap: 12px;
  align-items: center;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.3s ease;
}

.remove-btn:hover {
  background: rgba(220, 53, 69, 0.1);
}

.add-item-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  align-self: flex-start;
  margin-top: 8px;
}

.add-item-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.print-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
  position: relative;
  overflow: hidden;
}

.print-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.print-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
}

.print-btn:hover::before {
  left: 100%;
}

.print-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #495057);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.test-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
}

.test-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
}

.test-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #495057);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.invoice-preview {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.invoice-preview h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.preview-content {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.preview-header {
  text-align: center;
  margin-bottom: 10px;
}

.preview-details {
  margin: 10px 0;
}

.preview-items {
  margin: 10px 0;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
}

.preview-total {
  text-align: right;
  font-weight: bold;
  margin-top: 10px;
}

.print-history {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  height: fit-content;
}

.print-history h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.no-history {
  text-align: center;
  color: #6c757d;
  padding: 30px 20px;
  font-style: italic;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-time {
  font-size: 12px;
  color: #6c757d;
}

.history-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.history-status.success {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
}

.history-status.failed {
  background: linear-gradient(135deg, #f8d7da, #f1b0b7);
  color: #721c24;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.loading-content {
  background: white;
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  padding: 16px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  max-width: 350px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

.notification.success {
  background: linear-gradient(135deg, #28a745, #20c997);
}

.notification.error {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

.notification.warning {
  background: linear-gradient(135deg, #ffc107, #e0a800);
  color: #212529;
}

.notification.info {
  background: linear-gradient(135deg, #17a2b8, #138496);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .item-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .main-content {
    padding: 20px;
  }
  
  .invoice-demo,
  .print-history {
    padding: 20px;
  }
}
</style>