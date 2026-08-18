const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('--- STARTING BACKEND FOUNDATION VERIFICATION ---');

const projectRoot = path.resolve(__dirname, '..');

// Test 1: Verification of fail-fast behavior when missing environment variables
function testMissingEnv() {
  return new Promise((resolve) => {
    console.log('\n[Test 1] Verifying startup failure with missing required env variables...');
    
    const child = spawn(process.execPath, ['src/server.js'], {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH || '',
        PORT: '4009',
        TEST_MISSING_ENV: 'true'
      }
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log(`Exit code: ${code}`);
      console.log('Stderr content:\n', stderr);
      const isMissingDetected = stderr.includes('Startup Failed due to missing environment variables') && code === 1;
      
      if (isMissingDetected) {
        console.log('✅ PASS: Server exited cleanly with code 1 and reported missing variables.');
        resolve(true);
        } else {
        console.log('❌ FAIL: Server did not report missing variables or exit correctly.');
        resolve(false);
      }
    });
  });
}

// Test 2: Server startup, liveness check, and graceful shutdown (using mock credentials)
function testServerAndHealth() {
  return new Promise((resolve) => {
    console.log('\n[Test 2] Verifying successful server startup and GET /health response...');

    const child = spawn(process.execPath, ['src/server.js'], {
      cwd: projectRoot,
      env: {
        PATH: process.env.PATH || '',
        PORT: '4005',
        SUPABASE_URL: 'https://mock-project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key-1234567890'
      }
    });

    let stdout = '';
    let isServerStarted = false;

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write('  [Server Log]: ' + output);

      if (output.includes('Backend server started on port 4005')) {
        isServerStarted = true;
        
        // Query /health endpoint
        setTimeout(() => {
          http.get('http://localhost:4005/health', (res) => {
            let resData = '';
            res.on('data', (chunk) => { resData += chunk; });
            res.on('end', () => {
              const body = JSON.parse(resData);
              console.log('GET /health response:', body);

              const isHealthOk = res.statusCode === 200 && body.status === 'UP';
              if (isHealthOk) {
                console.log('✅ PASS: /health responded with status 200 OK and UP.');
                
                // Now test graceful shutdown by sending SIGINT
                console.log('\n[Test 3] Sending SIGINT to test graceful shutdown...');
                child.kill('SIGINT');
              } else {
                console.log('❌ FAIL: /health returned invalid response.');
                child.kill('SIGKILL');
                resolve(false);
              }
            });
          }).on('error', (err) => {
            console.log('❌ FAIL: Connection to /health failed:', err.message);
            child.kill('SIGKILL');
            resolve(false);
          });
        }, 500);
      }
    });

    child.on('close', (code) => {
      console.log(`Server process exited with code: ${code}`);
      
      // Verify no secrets appear in logs
      const containsSecrets = stdout.includes('mock-service-role-key-1234567890');
      console.log(`Secrets in logs check: ${containsSecrets ? '❌ FAILED (Secret Found!)' : '✅ CLEAN'}`);

      if (isServerStarted && (code === 0 || code === null) && !containsSecrets) {
        console.log('✅ PASS: Server shut down gracefully. No secrets leaked in logs.');
        resolve(true);
      } else {
        console.log('❌ FAIL: Server startup, shutdown or security audit failed.');
        resolve(false);
      }
    });
  });
}

async function runAll() {
  const t1 = await testMissingEnv();
  const t2 = await testServerAndHealth();
  
  if (t1 && t2) {
    console.log('\n🎉 ALL FOUNDATION VERIFICATIONS PASSED.');
    process.exit(0);
  } else {
    console.log('\n❌ SOME VERIFICATIONS FAILED.');
    process.exit(1);
  }
}

runAll();
