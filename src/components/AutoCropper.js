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
    const [errFiles, setErrFiles] = useState([])
    const [isProcessed, setIsProcessed] = useState(false)
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

    useEffect(() => {
        //when new image is loaded, crop photos and update state
        //if face is detected, add img name to state for filename when saving
        //otherwise, add filename to err state for display
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
                    if (newHeadshots.length > 0) {
                        const newImgName = (files[fileIndex].name.split('.'))[0]
                        setImgName(prevState => [...prevState,newImgName])
                    } else {
                        const newImgName = (files[fileIndex].name)
                        setErrFiles(prevState => [...prevState,newImgName])
                    }
                    //increment file index to process next img (if it exists)
                    setFileIndex(prevFileIndex => prevFileIndex + 1)
                }
            }
        } catch (e) {
            console.log('loading image failed',e)
        }
        //eslint-disable-next-line
    },[currentImg])

    useEffect(() => {
        //if file index is initialized, process images
        if (fileIndex !== null)
            processImages()
        //eslint-disable-next-line
    },[fileIndex])

    const handleImgLoad = async () => {
        //crop photos and return headshots, or log error
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
        //on file upload, update state with new files and reset index
        setFiles(e.target.files)
        setFileIndex(0)
    }

    const cropPhoto = async () => {
        //take the current img and create a canvas, set as canvasRef
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
            imgRef.current
        )

        //set max crop dimensions
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

        //if a face is detected, crop and return headshots
        if (detections !== undefined) {

            const box = detections.box

            const horizontalMarginPercentage = 25
            const verticalMarginperentage = 25

            const imageWidth = imgRef.current.width
            const imageHeight = imgRef.current.height

            //define margins
            const horizontalMargin = (imageWidth * horizontalMarginPercentage) / 100
            const verticalMargin = (imageHeight * verticalMarginperentage) / 100

            //calculate cropping dimensions with margins
            const targetSize = Math.min(box.width + 2 * horizontalMargin, box.height + 2 * verticalMargin)

            const cropWidth = targetSize
            const cropHeight = targetSize

            //calculate center of the detected face
            const centerX = box.x + box.width / 2
            const centerY = box.y + box.height / 2

            //calculate the top-left corner of the cropped region 
            const x = Math.max(centerX - cropWidth / 2, 0)
            const y = Math.max(centerY - cropHeight / 2, 0)

            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = cropWidth
            tempCanvas.height = cropHeight

            const tempContext = tempCanvas.getContext('2d')
            tempContext.drawImage(
                imgRef.current,
                x, y, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
            )

            const headshots = [tempCanvas.toDataURL()]
            return headshots
        } else {
            console.log(
                `Error! No face detected in ${currentImg}`
            )
            return []
        }
    }

    const savePhotos = async (headshots) => {
        //iterate through all headshots saved in state
        //take string and append "-cropped" to filename
        //save img
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
    }

    const processImages = async () => {
        if ((fileIndex !== null) && (fileIndex < files.length)) {
            //if file index is initiated and not beyond length of files,
            //update currentImg url and add file name to imgs
            const url = URL.createObjectURL(files[fileIndex])
            setCurrentImg(url)
        } else if ((files !== null) && (fileIndex === files.length)) {
            setIsProcessed(true)
        }
    }

    return(<div style={{
        display:'flex',
        flexDirection:'column',
        alignItems:'center'
    }}>
        <div style={{
            display:'flex',
            gap:'1rem'
        }}>
            <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
            {(headshots.length > 0) && <button onClick={()=>{savePhotos(headshots)}}>Save</button>}
        </div>
        <div style={{
            display:'flex',
            justifyContent:'center',

        }}>
            <img ref={imgRef} src={currentImg} style={{display:'none'}} crossOrigin="anonymous" alt='original'/>
            <canvas ref={canvasRef} style={{position:'absolute',display:'none'}}/>
            {/* after confirming crop is working: style={{display:'none'}} */}
        </div>
        {(isProcessed && headshots.length > 0) ? <h2 style={{color:"#00B6AC"}}>File processing completed!</h2>
        : (isProcessed && <h2 style={{color:'red'}}>No faces detected.</h2>)}
        {(errFiles.length > 0) &&
            <div>Unable to detect a face in the following files:
                <ul>
                    {errFiles.map((name,i)=>{
                        return <li key={i}>{name}</li>
                    })}
                </ul>
            </div>}
        {(headshots.length > 0) && 
            <div>
                <h2 style={{color:"#00B6AC"}}>Headshots:</h2>
                <div style={{
                    border:'5px solid #00B6AC',
                    borderRadius:'8px'
                }}>
                    {headshots.map((img,i) => <img key={i} src={img} alt='headshot' style={{width:'250px',height:'250px'}}/>)}
                </div>
            </div>
        }
    </div>)
}

export default AutoCropper