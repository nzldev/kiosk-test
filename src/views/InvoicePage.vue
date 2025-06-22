<template>
  <div>
    <h1>Invoice Page</h1>
    <button @click="printInvoice">🖨 Print Invoice</button>
    <PrinterConfigModal />
  </div>
</template>

<script setup>
import PrinterConfigModal from '@/components/PrinterConfigModal.vue'

const generateInvoice = () => {
  return `==== INVOICE ====\nItem 1    $5.00\nItem 2    $3.00\n----------------\nTotal     $8.00\n\nThank you!\n\n\n`
}

const printInvoice = async () => {
  const config = JSON.parse(localStorage.getItem('printerConfig') || '{}')
  if (!config.name) return alert('No printer configured.')

  try {
    if (!qz.websocket.isActive()) await qz.websocket.connect()

    const printerConfig = qz.configs.create(config.name, {
      copies: 1,
      encoding: 'UTF-8',
      rasterize: false,
    })

    const data = [
      {
        type: 'raw',
        format: 'plain',
        data: generateInvoice(),
      },
    ]

    await qz.print(printerConfig, data)
    alert('Printed!')
  } catch (e) {
    console.error('Print error:', e)
  }
}
</script>
