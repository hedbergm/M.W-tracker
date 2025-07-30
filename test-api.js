// Test bruker API
console.log('Testing bruker API...');

fetch('http://localhost:3000/api/bruker')
    .then(response => {
        console.log('GET response status:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(data => {
        console.log('GET success:', data);
        
        // Test POST
        console.log('Testing POST...');
        return fetch('http://localhost:3000/api/bruker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vekt: 75,
                hoyde: 180
            })
        });
    })
    .then(response => {
        console.log('POST response status:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(data => {
        console.log('POST success:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
