const axios = require('axios');
(async()=>{
 try{
  const login = await axios.post('http://localhost:5000/api/auth/login',{email:'admin@test.com',password:'admin123'});
  const token=login.data.token;
  const profileData={
    dateofbirth:'1990-01-01',
    location:'Test City',
    bio:'Test bio',
    position:'Forward',
    experiencelevel:'Intermediate',
    phone:'07123456789',
    coachinglicense:['FA Level 1','UEFA B']
  };
  const res = await axios.put('http://localhost:5000/api/profile', profileData,{headers:{Authorization:`Bearer ${token}`}});
  console.log('success',res.data);
 }catch(e){console.error('error',e.response?e.response.data:e.message);}
})();