// Controller handler to handle functionality in home page

// Example for handle a get request at '/' endpoint.

function getHome(request, response){
  // do any work you need to do, then
  response.render('home', {title: 'home'});
}

module.exports = {
    getHome
};

// Function to update auth UI after login
function updateAuthUI(username) {
  const authButtons = document.getElementById('auth-buttons');
  authButtons.innerHTML = `
      <span>Welcome, ${username}</span>
      <button type="button" onclick="viewProfile()">My Profile</button>
      <button type="button" onclick="logOut()">Log Out</button>
  `;
}

// Function to update auth UI after login
function updateAuthUI(username) {
  const authButtons = document.getElementById('auth-buttons');
  authButtons.innerHTML = `
      <span>Welcome, ${username}</span>
      <button type="button" onclick="viewProfile()">My Profile</button>
      <button type="button" onclick="logOut()">Log Out</button>
  `;
}

// Function to view profile
function viewProfile() {
  window.location.href = '/profile.hbs';
}

// Function to log out
function logOut() {
  localStorage.removeItem('token');
  alert('Logged out successfully');
  location.reload(); // Reload the page to reset the UI
}