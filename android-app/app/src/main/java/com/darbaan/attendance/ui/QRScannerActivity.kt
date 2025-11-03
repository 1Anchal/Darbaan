package com.darbaan.attendance.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.darbaan.attendance.R
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView

class QRScannerActivity : AppCompatActivity() {
    
    private lateinit var barcodeView: DecoratedBarcodeView
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            startScanning()
        } else {
            Toast.makeText(this, "Camera permission is required for QR scanning", Toast.LENGTH_LONG).show()
            finish()
        }
    }
    
    private val callback = BarcodeCallback { result: BarcodeResult ->
        handleQRResult(result.text)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scanner)
        
        barcodeView = findViewById(R.id.barcode_scanner)
        
        // Check camera permission
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                startScanning()
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }
    
    private fun startScanning() {
        barcodeView.decodeContinuous(callback)
        barcodeView.resume()
    }
    
    private fun handleQRResult(qrData: String) {
        // Parse QR code data (expected format: device registration info)
        try {
            val resultIntent = Intent().apply {
                putExtra("qr_data", qrData)
            }
            setResult(RESULT_OK, resultIntent)
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "Invalid QR code format", Toast.LENGTH_SHORT).show()
            barcodeView.resume()
        }
    }
    
    override fun onResume() {
        super.onResume()
        barcodeView.resume()
    }
    
    override fun onPause() {
        super.onPause()
        barcodeView.pause()
    }
}