import axios from 'axios';

async function test() {
  try {
    // login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'apprenant@ecole1.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log("Logged in:", loginRes.data.user.email);

    const res = await axios.get('http://localhost:5000/api/courses/shared/courses?schoolId=ALL&niveauId=ALL&classId=ALL', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Fetched ${res.data.length} courses:`);
    for (const c of res.data) {
       console.log(` - ${c.subject.name} in ${c.class.name} (${c.class.school.name})`);
    }

  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

test();
