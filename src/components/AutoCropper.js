//import react hooks
import {useState, useEffect, useRef} from "react"

//import faceapi
import * as faceapi from "face-api.js"

const AutoCropper = () => {

    //initialize state
    const [files, setFiles] = useState(null)
    const [fileIndex,setFileIndex] = useState(null)
    const [currentImg, setCurrentImg] = useState('')
    const [imgName, setImgName] = useState([])
    const [headshots, setHeadShots] = useState([])

    //initialize canvas & image refs
    const canvasRef = useRef()
    const imgRef = useRef()


    //effect fires on first render
    useEffect(() => {
        //load faceapi models
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
            } catch (e) {console.error(e)}; //catch and log errors
        }
        loadModels();
    },[])

    useEffect(()=>{
        try {
            if (imgRef.current){
                imgRef.current.onload = async () => {
                    let newHeadshots = []
                    try {
                        newHeadshots = await handleImgLoad()
                    } catch (e) {
                        console.log('error in handleImgLoad')
                    }
                    setHeadShots(prevHeadshots => [...prevHeadshots,...newHeadshots].flat())
                    setFileIndex(prevFileIndex => prevFileIndex + 1)
                }
            }
        } catch (e) {
            console.log('loading image failed',e)
        }
    },[currentImg])

    useEffect(() => {
        if (fileIndex !== null)
            processImages()
    },[fileIndex])

    const handleImgLoad = async () => {
        return new Promise(async (resolve,reject)=>{
            try {
                const headshots = await cropPhoto()
                resolve(headshots)
            } catch (e) {
                console.error("Fail at cropPhoto",e)
            }
        })
    }

    const handleUpload = (e) => {
        setFiles(e.target.files)
        setFileIndex(0)
    }

    const cropPhoto = async () => {
        return new Promise(async (resolve,reject) => {
            //take the current img and create a canvas, set as canvasRef
            canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
                imgRef.current
            )

            //set displaySize (tbd)
            const displaySize = {
                width: 500,
                height: 500
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
                const headshots = await extractFaceFromBox(imgRef.current, detections.box)
                resolve(headshots)
            } else {
                console.log(
                    `Error! No face detected in ${currentImg}`
                )
                resolve([])
            }
        })
    }

    const extractFaceFromBox = async (imgRef, box) => {
        return new Promise (async (resolve,reject) => {
            //draw rectangle using box dimensions from detected face, adjusted
            const regionsToExtract = [
                new faceapi.Rect(box.x-50,box.y-125,box.width+100,box.height+150)
            ]

            //extract face
            let faceImages = await faceapi.extractFaces(imgRef,regionsToExtract)
            
            //if no face, log error, otherwise set headshot to extracted face(s) and log it
            if (faceImages.length === 0) {
                console.log('No face found :(')
                resolve([])
            } else {
                const newHeadshots = []
                faceImages.forEach((cnv) => {
                    newHeadshots.push(cnv.toDataURL())
                })
                console.log('Face found')
                resolve(newHeadshots)
            }
        })
    }

    const savePhotos = async (headshots) => {
        return new Promise(async (resolve,reject)=>{
            let i = 0
            for (let img of headshots) {
                console.log(img)
                const link = document.createElement('a')
                link.href = img
                link.download = imgName[i] + '-cropped'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                i++
            }
            resolve()
        })
    }

    const processImages = async () => {
        if ((fileIndex !== null) && (fileIndex < files.length)) {
            // const loadingImgsPromise = Array.from(files).map(async (img) => {
            //     setCurrentImg(URL.createObjectURL(img))

            //     newImgNames.push(img.name.split('.')[0])
            // })
            // await Promise.all(loadingImgsPromise)
            const url = URL.createObjectURL(files[fileIndex])
            setCurrentImg(url)
            const newImgName = (files[fileIndex].name.split('.'))[0]
            setImgName(newImgName)
        }
    }

    return(<div>
        <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
        {(headshots.length > 0) && <button onClick={()=>{savePhotos(headshots)}}>Save</button>}
        <div style={{
            display:'flex',
            justifyContent:'center',

        }}>
            {currentImg && <img ref={imgRef} src={currentImg} crossOrigin="anonymous" alt='headshot'/>}
            {currentImg && <canvas ref={canvasRef} style={{position:'absolute'}}/>}
            {/* after confirming crop is working: style={{display:'none'}} */}
        </div>
        {(headshots.length > 0) && headshots.map((img,i) => <img key={i} src={img}/>)}
    </div>)
}

export default AutoCropper