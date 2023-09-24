//import react hooks
import {useState, useEffect, useRef} from "react"

//import faceapi
import * as faceapi from "face-api.js"

const AutoCropper = () => {

    //initialize state
    const [files, setFiles] = useState(null)
    const [currentImg, setCurrentImg] = useState('')
    const [modelsLoaded, setModelsLoaded] = useState(false)

    //initialize canvas & image refs
    const canvasRef = useRef()
    const imgRef = useRef()


    //effect fires on files change
    useEffect(() => {

        //since effects fire on first render, check if files is valid
        if (files !== null) {

            //if there are files (images), load faceapi models
            const loadModels = async () => {

                const MODEL_URL = process.env.PUBLIC_URL + '/models'

                Promise.all([
                    // models getting from public/model directory
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ])
                    .then(console.log("success", "/models"))
                    .then(
                        //iterate through all of the image files and update state each time
                        setModelsLoaded(true)
                    )
                    .catch((e) => console.error(e)); //catch and log errors
            }
            loadModels();

        }
    },[files])

    useEffect(() => {
        if (modelsLoaded) {
            Array.from(files).forEach((img) => {
                console.log(img)
                setCurrentImg(URL.createObjectURL(img))
            })
        }
    },[modelsLoaded,files])

    const handleImgLoad = () => {
        cropPhoto()
    }

    const handleUpload = (e) => {
        setFiles(e.target.files)
    }

    const cropPhoto = () => {
        //take the current img and create a canvas, set as canvasRef
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
            imgRef.current
        )

        //set displaySize (tbd)
        const displaySize = {
            width: 250,
            height: 250
        }

        
        
    }

    const savePhoto = () => {

    }

    return(<div>
        <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
        {currentImg && <img ref={imgRef} src={currentImg} onLoad={handleImgLoad} crossOrigin="anonymous"/>}
        {currentImg && <canvas ref={canvasRef} />}
        {/* after confirming crop is working: style={{display:'none'}} */}
    </div>)
}

export default AutoCropper