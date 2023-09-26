import './App.css';
import AutoCropper from "./components/AutoCropper"

function App() {
  return (
    <div className="App">
      <h1 style={{color:"#063A7F"}}>upload images below to get started:</h1>
      <AutoCropper />
    </div>
  );
}

export default App;
