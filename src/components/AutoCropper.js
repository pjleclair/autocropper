//import react hooks
import {useState, useEffect, useRef} from "react"

//import faceapi
import * as faceapi from "face-api.js"

const AutoCropper = () => {

    //initialize state
    const [files, setFiles] = useState(null)
    const [currentImg, setCurrentImg] = useState('')
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [headshot, setHeadShot] = useState('')

    //initialize canvas & image refs
    const canvasRef = useRef()
    const imgRef = useRef()


    //effect fires on files change
    useEffect(() => {

        //since effects fire on first render, check if files is valid
        if (files !== null) {

            //if there are files (images), load faceapi models
            const loadModels = async () => {
                
                //set file path to faceapi models
                const MODEL_URL = process.env.PUBLIC_URL + '/models'

                //try to load models
                try {
                    await Promise.all([
                        // models getting from public/model directory
                        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                    ])
                    console.log("success", "/models")
                    //update state to indicate models are loaded
                    setModelsLoaded(true)
                } catch (e) {console.error(e)}; //catch and log errors
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

    const cropPhoto = async () => {
        //take the current img and create a canvas, set as canvasRef
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
            imgRef.current
        )

        //set displaySize (tbd)
        const displaySize = {
            width: 600,
            height: 600
        }


        //match dimensions and detect a face, then resize
        faceapi.matchDimensions(canvasRef.current, displaySize)
        const detections = await faceapi.detectSingleFace(
            imgRef.current,
            new faceapi.TinyFaceDetectorOptions()
        )

        //if a face is detected, draw a rectangle and log dimensions
        if (detections !== undefined) {
            const resizeDetections = faceapi.resizeResults(detections,displaySize)
        
            //draw a rectangle on the canvas using detected face
            canvasRef.current
                .getContext("2d")
                .clearRect(0,0,displaySize.width,displaySize.height)
            faceapi.draw.drawDetections(canvasRef.current, resizeDetections)
            
            //log dimensions
            console.log(
                `Width ${detections.box._width} and Height ${detections.box._height}`
            )

            //extract face from drawn rectangle
            extractFaceFromBox(imgRef.current, detections.box)
        } else {
            console.log(
                `Error! No face detected.`
            )
        }
        
        
        
    }

    const extractFaceFromBox = async (imgRef, box) => {
        const regionsToExtract = [
            new faceapi.Rect(box.x-100,box.y-125,box.width+200,box.height+200)
        ]
        let faceImages = await faceapi.extractFaces(imgRef,regionsToExtract)
        if (faceImages.length === 0) {
            console.log('No face found :(')
        } else {
            faceImages.forEach((cnv) => {
                setHeadShot(cnv.toDataURL())
            })
            console.log('Face found:')
            console.log(headshot)
        }
    }

    const savePhoto = () => {

    }

    return(<div>
        <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
        <div style={{
            display:'flex',
            justifyContent:'center',

        }}>
            {currentImg && <img ref={imgRef} src={currentImg} onLoad={handleImgLoad} crossOrigin="anonymous" alt='headshot'/>}
            {currentImg && <canvas ref={canvasRef} style={{position:'absolute'}}/>}
            {/* after confirming crop is working: style={{display:'none'}} */}
        </div>
        {headshot && <img src={headshot}/>}
    </div>)
}

export default AutoCropper