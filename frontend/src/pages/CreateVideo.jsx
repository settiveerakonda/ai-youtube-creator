import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_URL = "https://ai-youtube-creator.onrender.com";

const CreateVideoWizard = () => {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [scriptSource, setScriptSource] = useState("ai");
  const [manualScript, setManualScript] = useState("");

  const [formData, setFormData] = useState({
    topic: "",
    language: "Telugu",
    duration: "5 Minutes",
    category: "Stock Market",
    style: "Educational",
  });

  const [generatedScript, setGeneratedScript] = useState([]);
  const [editedScript, setEditedScript] = useState([]);
  const [isEditingScript, setIsEditingScript] = useState(false);

  const [voiceType, setVoiceType] = useState("ai");
  const [selectedAIVoice, setSelectedAIVoice] = useState("telugu-female");
  const [userVoiceId, setUserVoiceId] = useState("");
  const [audioReady, setAudioReady] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // Visuals & Processing States
  const [visualScenes, setVisualScenes] = useState([]);
  const [pexelsResults, setPexelsResults] = useState({});
  const [pexelsLoading, setPexelsLoading] = useState({});
  const [imageSearchText, setImageSearchText] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});

  const [finalPrepared, setFinalPrepared] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [previewSceneIndex, setPreviewSceneIndex] = useState(null);

  // ============================================================
  // REFS
  // ============================================================
  const fileInputRefs = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);

  const aiVoices = [
    {
      id: "telugu-female",
      name: "Telugu Female",
      description: "Natural and clear female narration",
      icon: "👩",
      elevenLabsId: "EXAVITQu4vr4xnSDxMaL",
    },
    {
      id: "telugu-male",
      name: "Telugu Male",
      description: "Professional and confident male narration",
      icon: "👨",
      elevenLabsId: "CwhRBWXzGAHq8TQ4Fs17",
    },
  ];

  const steps = [
    { number: 1, title: "Setup", icon: "⚙️" },
    { number: 2, title: "Script", icon: "📝" },
    { number: 3, title: "Voice", icon: "🎙️" },
    { number: 4, title: "Visuals", icon: "🖼️" },
    { number: 5, title: "Final Video", icon: "🎬" },
  ];

  // ============================================================
  // RECORDING TIMER & CLEANUP
  // ============================================================
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl && recordedAudioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  // ============================================================
  // HELPERS & HANDLERS
  // ============================================================
  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
      return url;
    }
    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ============================================================
  // VOICE RECORDING & UPLOAD HANDLERS
  // ============================================================
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser does not support microphone recording.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      recordingChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: "audio/webm",
        });

        const audioUrl = URL.createObjectURL(audioBlob);

        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);

        stream.getTracks().forEach((track) => {
          track.stop();
        });
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Microphone error:", error);
      alert("Microphone permission is required to record your voice.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setMediaRecorder(null);
  };

  const resetRecording = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }

    setRecordedAudioUrl("");
    setRecordedAudioBlob(null);
    setRecordingTime(0);
    setUserVoiceId("");
  };
  
const uploadUserVoice = async () => {
  if (!recordedAudioBlob) {
    alert("Please record your voice first.");
    return;
  }

  try {
    setUploadingVoice(true);

    const audioFile = new File(
      [recordedAudioBlob],
      `my_voice_${Date.now()}.webm`,
      {
        type: "audio/webm",
      }
    );

    const uploadData = new FormData();

    // IMPORTANT: backend expects "voice"
    uploadData.append(
      "voice",
      audioFile
    );

    uploadData.append(
      "name",
      "My Voice"
    );

    uploadData.append(
      "language",
      formData.language || "English"
    );

    // IMPORTANT: backend route is /api/voices/upload
    const response = await fetch(
      `${API_URL}/api/voices/upload`,
      {
        method: "POST",
        body: uploadData,
      }
    );

    // Don't blindly parse HTML as JSON
    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      throw new Error(
        `Server returned non-JSON response (${response.status}): ${text.substring(
          0,
          200
        )}`
      );
    }

    const data = await response.json();

    console.log(
      "🎙️ Voice upload response:",
      data
    );

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Voice upload failed."
      );
    }

    const voiceId =
      data.voiceId ||
      data.voice?.id ||
      data.voice?._id;

    if (!voiceId) {
      throw new Error(
        "Voice uploaded but voice ID was not returned."
      );
    }

    setUserVoiceId(
      String(voiceId)
    );

    console.log(
      "✅ User Voice ID:",
      voiceId
    );

    alert(
      "✅ Your voice was cloned successfully!"
    );

  } catch (error) {
    console.error(
      "❌ User voice upload error:",
      error
    );

    alert(
      error.message ||
        "Failed to upload your voice."
    );

  } finally {
    setUploadingVoice(false);
  }
};

  // ============================================================
  // MANUAL SCRIPT HELPERS
  // ============================================================
  const getTargetDurationSeconds = () => {
    const match = String(formData.duration || "5").match(/\d+/);
    return (match ? Number(match[0]) : 5) * 60;
  };

  const estimateWords = (text) =>
    String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const estimateScriptMinutes = (text) => {
    const words = estimateWords(text);
    return words ? words / 150 : 0;
  };

  const createManualScenes = (text) => {
    const cleanText = String(text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (!cleanText) return [];

    const paragraphs = cleanText
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const units = [];
    paragraphs.forEach((paragraph) => {
      const words = estimateWords(paragraph);
      if (words <= 130) {
        units.push(paragraph);
        return;
      }

      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      let buffer = "";
      sentences.forEach((sentence) => {
        const next = `${buffer} ${sentence.trim()}`.trim();
        if (estimateWords(next) > 110 && buffer) {
          units.push(buffer.trim());
          buffer = sentence.trim();
        } else {
          buffer = next;
        }
      });
      if (buffer) units.push(buffer.trim());
    });

    const targetSceneCount = Math.max(1, Math.ceil(getTargetDurationSeconds() / 60));
    const desiredSceneCount = Math.min(15, Math.max(1, Math.round(targetSceneCount * 0.6)));

    const totalWords = units.reduce((sum, unit) => sum + estimateWords(unit), 0) || 1;
    const scenes = [];
    let current = "";
    let currentWords = 0;
    const wordsPerScene = Math.max(80, Math.ceil(totalWords / desiredSceneCount));

    units.forEach((unit) => {
      const unitWords = estimateWords(unit);
      if (current && currentWords + unitWords > wordsPerScene && scenes.length < desiredSceneCount - 1) {
        scenes.push(current.trim());
        current = unit;
        currentWords = unitWords;
      } else {
        current = `${current} ${unit}`.trim();
        currentWords += unitWords;
      }
    });
    if (current) scenes.push(current.trim());

    const totalSceneWords = scenes.reduce((sum, scene) => sum + estimateWords(scene), 0) || 1;
    const targetDuration = getTargetDurationSeconds();

    return scenes.map((narrationText, index) => {
      const wordCount = estimateWords(narrationText);
      const duration = Math.max(10, Math.round((wordCount / totalSceneWords) * targetDuration));
      const firstSentence = (narrationText.match(/^[\s\S]*?[.!?](?:\s|$)/) || [narrationText])[0]
        .replace(/[\r\n]+/g, " ")
        .trim()
        .slice(0, 220);

      return {
        sceneNumber: index + 1,
        duration,
        visualDescription: `${formData.category} video visual related to: ${firstSentence}`,
        narrationText,
        audioUrl: "",
        images: [],
      };
    });
  };

  const startPipelineExecution = async (e) => {
    e.preventDefault();

    try {
      if (scriptSource === "manual") {
        if (!manualScript.trim()) {
          alert("Please paste or write your script first.");
          return;
        }

        const scenes = createManualScenes(manualScript);
        if (!scenes.length) {
          alert("Could not create scenes from your script.");
          return;
        }

        setLoading(true);
        setLoadingMessage("📄 Preparing your script into video scenes...");

        const estimatedMinutes = estimateScriptMinutes(manualScript);
        const selectedMinutes = Number(String(formData.duration).match(/\d+/)?.[0] || 5);

        const cleanScript = scenes.map((scene, index) => ({
          ...scene,
          sceneNumber: index + 1,
          duration: Number(scene.duration) || 30,
          visualDescription: scene.visualDescription || "",
          narrationText: scene.narrationText || "",
          audioUrl: "",
          images: [],
        }));

        setGeneratedScript(cleanScript);
        setEditedScript(JSON.parse(JSON.stringify(cleanScript)));
        setIsEditingScript(true);
        setCurrentStep(2);

        if (Math.abs(estimatedMinutes - selectedMinutes) > 1.5) {
          setTimeout(() => {
            alert(
              `ℹ️ Your script is approximately ${estimatedMinutes.toFixed(1)} minutes long.\n\n` +
              `Selected video duration: ${selectedMinutes} minutes.\n\n` +
              `Your original script will be preserved. You can adjust scene durations in Step 2.`
            );
          }, 100);
        }
        return;
      }

      if (!formData.topic.trim()) {
        alert("Please enter your video topic.");
        return;
      }

      setLoading(true);
      setLoadingMessage("🤖 AI is creating your structured video script...");

      const response = await axios.post(`${API_URL}/api/videos/generate-script-only`, formData);
      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || "Script generation failed.");
      }

      const script = response.data.script || response.data.scenes || [];
      if (!script.length) throw new Error("AI did not return any scenes.");

      const cleanScript = script.map((scene, index) => ({
        ...scene,
        sceneNumber: scene.sceneNumber || index + 1,
        duration: Number(scene.duration) || 30,
        visualDescription: scene.visualDescription || "",
        narrationText: scene.narrationText || "",
        audioUrl: scene.audioUrl || "",
        images: [],
      }));

      setGeneratedScript(cleanScript);
      setEditedScript(JSON.parse(JSON.stringify(cleanScript)));
      setIsEditingScript(true);
      setCurrentStep(2);
    } catch (error) {
      console.error("Script generation error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || "Failed to generate script.");
    } finally {
      setLoading(false);
    }
  };

  const handleSceneChange = (sceneIndex, field, value) => {
    setEditedScript((prev) => {
      const updated = [...prev];
      updated[sceneIndex] = {
        ...updated[sceneIndex],
        [field]: field === "duration" ? Number(value) : value,
      };
      return updated;
    });
  };

  const deleteScene = (sceneIndex) => {
    if (editedScript.length <= 1) {
      alert("At least one scene is required.");
      return;
    }
    if (!window.confirm(`Delete Scene ${sceneIndex + 1}?`)) return;

    const filtered = editedScript.filter((_, index) => index !== sceneIndex);
    setEditedScript(filtered.map((scene, index) => ({ ...scene, sceneNumber: index + 1 })));
  };

  const addScene = () => {
    setEditedScript((prev) => [
      ...prev,
      {
        sceneNumber: prev.length + 1,
        duration: 30,
        visualDescription: "Describe the visual for this scene.",
        narrationText: "Write the narration for this scene.",
        audioUrl: "",
        images: [],
      },
    ]);
  };

  const totalScriptDuration = useMemo(() => {
    return editedScript.reduce((total, scene) => total + Number(scene.duration || 0), 0);
  }, [editedScript]);

  const saveScriptChanges = () => {
    if (!editedScript.length) {
      alert("No scenes available.");
      return;
    }

    for (let i = 0; i < editedScript.length; i++) {
      const scene = editedScript[i];
      if (!scene.narrationText?.trim()) {
        alert(`Scene ${i + 1} narration cannot be empty.`);
        return;
      }
      if (!scene.visualDescription?.trim()) {
        alert(`Scene ${i + 1} visual description cannot be empty.`);
        return;
      }
      if (!scene.duration || Number(scene.duration) <= 0) {
        alert(`Scene ${i + 1} duration must be greater than 0.`);
        return;
      }
    }

    const finalScript = JSON.parse(JSON.stringify(editedScript));
    setGeneratedScript(finalScript);
    setEditedScript(finalScript);
    setIsEditingScript(false);
    setCurrentStep(3);
  };

  const cancelScriptEditing = () => {
    if (!window.confirm("Discard all script changes?")) return;
    setEditedScript(JSON.parse(JSON.stringify(generatedScript)));
    setIsEditingScript(false);
  };

  const generateVideoAudio = async () => {
    if (!generatedScript.length) {
      alert("No script available.");
      return;
    }
    if (voiceType === "user" && !userVoiceId) {
      alert("Please record and upload your voice first.");
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("🎙️ Generating audio for every scene...");

      const payload = {
        scenes: generatedScript,
        voiceType,
        language: formData.language,
      };

      if (voiceType === "ai") {
        const selectedVoice = aiVoices.find((v) => v.id === selectedAIVoice);
        if (!selectedVoice) throw new Error("Please select an AI voice.");
        payload.voiceId = selectedVoice.elevenLabsId;
      }

      if (voiceType === "user") {
        payload.userVoiceId = userVoiceId;
      }

      const response = await axios.post(`${API_URL}/api/voices/generate-video-audio`, payload);
      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || "Audio generation failed.");
      }

      const audioScenes = response.data.scenes || [];
      if (!audioScenes.length) throw new Error("No audio scenes returned.");

      const preparedScenes = audioScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: scene.sceneNumber || index + 1,
        duration: Number(scene.duration) || 30,
        images: Array.isArray(scene.images) ? scene.images : [],
      }));

      setGeneratedScript(preparedScenes);
      setEditedScript(preparedScenes);
      setVisualScenes(preparedScenes);
      setAudioReady(true);
      setCurrentStep(4);
    } catch (error) {
      console.error("Audio generation error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || "Audio generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const searchPexelsImages = async (sceneIndex) => {
    const scene = visualScenes[sceneIndex];
    if (!scene) return;

    const query = imageSearchText[sceneIndex]?.trim() || scene.visualDescription || formData.topic;
    if (!query.trim()) {
      alert("Please enter a search keyword.");
      return;
    }

    try {
      setPexelsLoading((prev) => ({ ...prev, [sceneIndex]: true }));
      const response = await axios.get(`${API_URL}/api/videos/search-pexels`, {
        params: { query, perPage: 12 },
      });

      if (!response.data.success) throw new Error(response.data.message || "Pexels search failed.");
      setPexelsResults((prev) => ({ ...prev, [sceneIndex]: response.data.photos || [] }));
    } catch (error) {
      console.error("Pexels search error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || "Pexels search failed.");
    } finally {
      setPexelsLoading((prev) => ({ ...prev, [sceneIndex]: false }));
    }
  };

  const addPexelsImage = (sceneIndex, photo) => {
    const imageUrl = photo.src?.large || photo.src?.medium || photo.src?.original || photo.url;
    if (!imageUrl) {
      alert("Pexels image URL is missing.");
      return;
    }

    const newImage = {
      id: `pexels-${photo.id}-${Date.now()}`,
      source: "pexels",
      pexelsId: photo.id,
      url: imageUrl,
      thumbnail: photo.src?.medium || imageUrl,
      duration: 5,
      photographer: photo.photographer || "",
    };

    setVisualScenes((prev) =>
      prev.map((scene, index) =>
        index !== sceneIndex ? scene : { ...scene, images: [...(scene.images || []), newImage] }
      )
    );
  };

  const handleLocalImageUpload = async (sceneIndex, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploadingImages((prev) => ({ ...prev, [sceneIndex]: true }));
      const formDataUpload = new FormData();
      files.forEach((file) => formDataUpload.append("images", file));

      const response = await axios.post(`${API_URL}/api/videos/upload-image`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data.success) throw new Error(response.data.message || "Image upload failed.");

      const uploadedImages = (response.data.images || []).map((img) => ({
        ...img,
        url: getMediaUrl(img.url),
        duration: Number(img.duration) || 5,
      }));

      setVisualScenes((prev) =>
        prev.map((scene, index) =>
          index !== sceneIndex ? scene : { ...scene, images: [...(scene.images || []), ...uploadedImages] }
        )
      );

      alert(`✅ ${uploadedImages.length} image(s) uploaded successfully.`);
    } catch (error) {
      console.error("Image upload error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || "Image upload failed.");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [sceneIndex]: false }));
      event.target.value = "";
    }
  };

  const openImagePicker = (sceneIndex) => {
    fileInputRefs.current[sceneIndex]?.click();
  };

  const removeImageFromScene = (sceneIndex, imageIndex) => {
    setVisualScenes((prev) =>
      prev.map((scene, index) =>
        index !== sceneIndex
          ? scene
          : { ...scene, images: (scene.images || []).filter((_, idx) => idx !== imageIndex) }
      )
    );
  };

  const moveImage = (sceneIndex, imageIndex, direction) => {
    setVisualScenes((prev) =>
      prev.map((scene, index) => {
        if (index !== sceneIndex) return scene;

        const images = [...(scene.images || [])];
        const targetIndex = direction === "left" ? imageIndex - 1 : imageIndex + 1;

        if (targetIndex < 0 || targetIndex >= images.length) {
          return scene;
        }

        [images[imageIndex], images[targetIndex]] = [images[targetIndex], images[imageIndex]];

        return {
          ...scene,
          images,
        };
      })
    );
  };

  const toggleScenePreview = (sceneIndex) => {
    setPreviewSceneIndex((current) => (current === sceneIndex ? null : sceneIndex));
  };

  const updateImageDuration = (sceneIndex, imageIndex, value) => {
    const duration = Math.max(1, Number(value) || 1);
    setVisualScenes((prev) =>
      prev.map((scene, index) =>
        index !== sceneIndex
          ? scene
          : {
              ...scene,
              images: (scene.images || []).map((img, idx) =>
                idx === imageIndex ? { ...img, duration } : img
              ),
            }
      )
    );
  };

  const getImageDuration = (scene) => {
    return (scene.images || []).reduce((total, img) => total + Number(img.duration || 0), 0);
  };

  const getVisualStatus = (scene) => {
    const required = Number(scene.duration || 0);
    const available = getImageDuration(scene);
    if (!scene.images || scene.images.length === 0) return "empty";
    if (available < required) return "short";
    return "ready";
  };

  const visualsAreReady =
    visualScenes.length > 0 && visualScenes.every((scene) => getVisualStatus(scene) === "ready");

  const saveVisualsAndContinue = () => {
    if (!visualScenes.length) {
      alert("No scenes available.");
      return;
    }

    for (let i = 0; i < visualScenes.length; i++) {
      const scene = visualScenes[i];
      const status = getVisualStatus(scene);
      if (status === "empty") {
        alert(`Scene ${i + 1} has no images. Add at least one image.`);
        return;
      }
      if (status === "short") {
        const available = getImageDuration(scene);
        alert(`Scene ${i + 1} needs more image duration.\n\nRequired: ${scene.duration} sec\nAvailable: ${available} sec`);
        return;
      }
    }

    const finalScenes = JSON.parse(JSON.stringify(visualScenes));
    setGeneratedScript(finalScenes);
    setEditedScript(finalScenes);
    setCurrentStep(5);
  };

  const prepareFinalVideo = async () => {
    if (!visualsAreReady) {
      alert("Please complete all scene visuals first.");
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("🎬 Checking script, audio and visuals...");

      const response = await axios.post(`${API_URL}/api/videos/compile-final`, {
        topic: formData.topic,
        language: formData.language,
        scenes: visualScenes,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || "Final video preparation failed.");
      }

      const returnedVideoUrl =
        response.data.finalVideoUrl ||
        response.data.videoUrl ||
        response.data.finalVideo ||
        response.data.outputUrl ||
        response.data.url ||
        "";

      setFinalVideoUrl(returnedVideoUrl);
      setFinalPrepared(true);
      alert(
        returnedVideoUrl
          ? "🎉 Final video created successfully!"
          : "✅ Final video generation completed."
      );
    } catch (error) {
      console.error("Final preparation error:", error);
      alert(error.response?.data?.message || error.response?.data?.error || error.message || "Final video preparation failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    resetRecording();
    setCurrentStep(1);
    setScriptSource("ai");
    setManualScript("");
    setLoading(false);
    setLoadingMessage("");
    setGeneratedScript([]);
    setEditedScript([]);
    setIsEditingScript(false);
    setVoiceType("ai");
    setSelectedAIVoice("telugu-female");
    setUserVoiceId("");
    setAudioReady(false);
    setVisualScenes([]);
    setPexelsResults({});
    setPexelsLoading({});
    setImageSearchText({});
    setUploadingImages({});
    setFinalPrepared(false);
    setFinalVideoUrl("");
    setPreviewSceneIndex(null);
    setFormData({
      topic: "",
      language: "Telugu",
      duration: "5 Minutes",
      category: "Stock Market",
      style: "Educational",
    });
  };

  // ============================================================
  // RENDER UI
  // ============================================================
  return (
    <div className="bg-light min-vh-100 py-4 py-lg-5">
      <div className="container">
        {/* HEADER */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white shadow-sm mb-3"
            style={{ width: "64px", height: "64px", fontSize: "28px" }}
          >
            🎬
          </div>
          <h1 className="fw-bold mb-2">AI Video Creator</h1>
          <p className="text-secondary mb-0">Script → Voice → Visuals → Final Video</p>
        </div>

        {/* STEPPER */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-md-4">
            <div className="row g-2">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                return (
                  <div className="col-6 col-md" key={step.number}>
                    <div
                      className={`d-flex align-items-center gap-2 rounded-3 p-2 ${
                        isActive
                          ? "bg-primary text-white"
                          : isCompleted
                          ? "bg-success-subtle text-success"
                          : "bg-light text-secondary"
                      }`}
                    >
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${
                          isActive ? "bg-white text-primary" : isCompleted ? "bg-success text-white" : "bg-white"
                        }`}
                        style={{ width: "38px", height: "38px", flexShrink: 0 }}
                      >
                        {isCompleted ? "✓" : step.icon}
                      </div>
                      <div className="d-none d-lg-block">
                        <div className="small fw-semibold">STEP {step.number}</div>
                        <div className="fw-bold">{step.title}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CONTAINER */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3 p-md-5">
            {/* LOADING STATE */}
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-4" role="status" style={{ width: "3rem", height: "3rem" }} />
                <h4 className="fw-bold">Processing...</h4>
                <p className="text-secondary">{loadingMessage}</p>
              </div>
            )}

            {/* STEP 1: FORM SETUP */}
            {!loading && currentStep === 1 && (
              <form onSubmit={startPipelineExecution}>
                <div className="mb-4">
                  <span className="badge text-bg-primary mb-2">STEP 1</span>
                  <h2 className="fw-bold">Create Your Video</h2>
                  <p className="text-secondary mb-0">
                    Generate a script with AI or use your own script.
                  </p>
                </div>

                {/* SCRIPT SOURCE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">📝 How do you want to create your script?</label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`card w-100 h-100 text-start border-2 ${
                          scriptSource === "ai" ? "border-primary bg-primary-subtle" : "border-light"
                        }`}
                        onClick={() => setScriptSource("ai")}
                      >
                        <div className="card-body p-4">
                          <div className="d-flex gap-3">
                            <div className="fs-2">🤖</div>
                            <div>
                              <h5 className="fw-bold mb-1">Generate Script with AI</h5>
                              <p className="text-secondary mb-0 small">
                                Give a topic and let AI create the complete script.
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`card w-100 h-100 text-start border-2 ${
                          scriptSource === "manual" ? "border-primary bg-primary-subtle" : "border-light"
                        }`}
                        onClick={() => setScriptSource("manual")}
                      >
                        <div className="card-body p-4">
                          <div className="d-flex gap-3">
                            <div className="fs-2">📄</div>
                            <div>
                              <h5 className="fw-bold mb-1">Use My Own Script</h5>
                              <p className="text-secondary mb-0 small">
                                Paste your script. We will keep your narration unchanged.
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI TOPIC */}
                {scriptSource === "ai" && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Video Topic</label>
                    <textarea
                      className="form-control form-control-lg"
                      rows="3"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      placeholder="Example: Explain mutual funds for beginners in Telugu"
                    />
                    <div className="form-text">Give AI a clear topic.</div>
                  </div>
                )}

                {/* MANUAL SCRIPT */}
                {scriptSource === "manual" && (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-semibold mb-0">Your Script</label>
                      <span className="badge text-bg-light border text-dark">
                        {estimateWords(manualScript)} words · ~{estimateScriptMinutes(manualScript).toFixed(1)} min
                      </span>
                    </div>
                    <textarea
                      className="form-control"
                      rows="14"
                      value={manualScript}
                      onChange={(e) => setManualScript(e.target.value)}
                      placeholder={`Paste or write your complete script here...\n\nExample:\nMutual funds ante enti? Simple ga cheppalante...`}
                      style={{ resize: "vertical", minHeight: "280px" }}
                    />
                    <div className="alert alert-info mt-3 mb-0">
                      <div className="fw-bold">🔒 Your narration stays unchanged</div>
                      <div className="small mt-1">
                        We only divide your script into scenes so it can continue through Voice → Visuals → Final Video.
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCTION SETTINGS */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Language</label>
                    <select className="form-select form-select-lg" name="language" value={formData.language} onChange={handleInputChange}>
                      <option value="Telugu">Telugu</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Target Duration</label>
                    <select className="form-select form-select-lg" name="duration" value={formData.duration} onChange={handleInputChange}>
                      <option>5 Minutes</option>
                      <option>10 Minutes</option>
                      <option>15 Minutes</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Category</label>
                    <select className="form-select form-select-lg" name="category" value={formData.category} onChange={handleInputChange}>
                      <option>Stock Market</option>
                      <option>Education</option>
                      <option>Technology</option>
                      <option>Finance</option>
                      <option>Entertainment</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Video Style</label>
                    <select className="form-select form-select-lg" name="style" value={formData.style} onChange={handleInputChange}>
                      <option>Educational</option>
                      <option>Documentary</option>
                      <option>Storytelling</option>
                      <option>News</option>
                      <option>Explainer</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between bg-light rounded-3 p-3 mb-4">
                  <div>
                    <div className="fw-bold">{scriptSource === "ai" ? "🤖 AI Script Mode" : "📄 My Script Mode"}</div>
                    <div className="small text-secondary">
                      {scriptSource === "ai"
                        ? "AI will create your narration and scene visuals."
                        : "Your original narration will be preserved."}
                    </div>
                  </div>
                  <span className="badge text-bg-primary">Step 1 Ready</span>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100">
                  {scriptSource === "ai" ? "🚀 Generate AI Script" : "📄 Use My Script & Continue"}
                </button>
              </form>
            )}

            {/* STEP 2: SCRIPT EDITOR */}
            {!loading && currentStep === 2 && (
              <div>
                <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
                  <div>
                    <span className="badge text-bg-primary mb-2">STEP 2</span>
                    <h2 className="fw-bold">Script Editor</h2>
                    <p className="text-secondary mb-0">Edit your script before generating the voice.</p>
                  </div>
                  <div className="d-flex gap-2">
                    <span className="badge text-bg-light border text-dark">🎬 {editedScript.length} Scenes</span>
                    <span className="badge text-bg-light border text-dark">⏱️ {totalScriptDuration} sec</span>
                  </div>
                </div>

                {isEditingScript ? (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold mb-0">Edit Scenes</h5>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={addScene}>
                        + Add Scene
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-4" style={{ maxHeight: "700px", overflowY: "auto" }}>
                      {editedScript.map((scene, index) => (
                        <div className="card border shadow-sm" key={index}>
                          <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <span className="badge text-bg-primary">Scene {index + 1}</span>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => deleteScene(index)}>
                              🗑️ Delete
                            </button>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-md-4">
                                <label className="form-label fw-semibold">Duration (seconds)</label>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-control"
                                  value={scene.duration || ""}
                                  onChange={(e) => handleSceneChange(index, "duration", e.target.value)}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label fw-semibold">🖼️ Visual Description</label>
                                <textarea
                                  className="form-control"
                                  rows="4"
                                  value={scene.visualDescription || ""}
                                  onChange={(e) => handleSceneChange(index, "visualDescription", e.target.value)}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label fw-semibold">🎙️ Narration</label>
                                <textarea
                                  className="form-control"
                                  rows="6"
                                  value={scene.narrationText || ""}
                                  onChange={(e) => handleSceneChange(index, "narrationText", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-outline-secondary" onClick={cancelScriptEditing}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary flex-grow-1" onClick={saveScriptChanges}>
                        💾 Save Script & Continue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-success">✓ Script saved successfully.</div>
                    <div className="d-flex flex-column gap-3">
                      {generatedScript.map((scene, index) => (
                        <div className="card border" key={index}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between mb-3">
                              <span className="badge text-bg-primary">Scene {index + 1}</span>
                              <span className="small text-secondary">⏱️ {scene.duration} sec</span>
                            </div>
                            <div className="mb-3">
                              <small className="fw-bold text-secondary">VISUAL</small>
                              <p>{scene.visualDescription}</p>
                            </div>
                            <div>
                              <small className="fw-bold text-secondary">NARRATION</small>
                              <div className="bg-light rounded-3 p-3">{scene.narrationText}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-outline-primary" onClick={() => setIsEditingScript(true)}>
                        ✏️ Edit Script
                      </button>
                      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => setCurrentStep(3)}>
                        🎙️ Continue to Voice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: VOICE SELECTION */}
            {!loading && currentStep === 3 && (
              <div>
                <div className="mb-4">
                  <span className="badge text-bg-primary mb-2">STEP 3</span>
                  <h2 className="fw-bold">Choose Your Voice</h2>
                  <p className="text-secondary">Select or record the voice that will narrate your video.</p>
                </div>

                {/* AI Voice Selection */}
                <div
                  className={`card mb-3 ${voiceType === "ai" ? "border-primary shadow-sm" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setVoiceType("ai")}
                >
                  <div className="card-body p-4">
                    <div className="d-flex gap-3">
                      <input
                        className="form-check-input mt-1"
                        type="radio"
                        checked={voiceType === "ai"}
                        onChange={() => setVoiceType("ai")}
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h5 className="fw-bold">🤖 AI Voice</h5>
                            <p className="text-secondary mb-0">Professional AI narration.</p>
                          </div>
                          <span className="badge text-bg-success">Recommended</span>
                        </div>
                        {voiceType === "ai" && (
                          <div className="row g-3 mt-3">
                            {aiVoices.map((voice) => (
                              <div className="col-md-6" key={voice.id}>
                                <div
                                  className={`card h-100 ${selectedAIVoice === voice.id ? "border-primary bg-primary-subtle" : ""}`}
                                  style={{ cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAIVoice(voice.id);
                                  }}
                                >
                                  <div className="card-body">
                                    <div className="d-flex align-items-center gap-3">
                                      <div
                                        className="rounded-circle bg-white d-flex align-items-center justify-content-center"
                                        style={{ width: "48px", height: "48px", fontSize: "22px" }}
                                      >
                                        {voice.icon}
                                      </div>
                                      <div>
                                        <div className="fw-bold">{voice.name}</div>
                                        <div className="small text-secondary">{voice.description}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Voice Option */}
                <div
                  className={`card mb-3 ${voiceType === "user" ? "border-primary shadow-sm" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setVoiceType("user")}
                >
                  <div className="card-body p-4">
                    <div className="d-flex gap-3">
                      <input
                        className="form-check-input mt-1"
                        type="radio"
                        checked={voiceType === "user"}
                        onChange={() => setVoiceType("user")}
                      />
                      <div className="flex-grow-1">
                        <h5 className="fw-bold mb-1">🎙️ My Voice (Record & Upload)</h5>
                        <p className="text-secondary mb-0">Record your own voice sample for custom audio narration.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MY VOICE - RECORDING PANEL */}
                {voiceType === "user" && (
                  <div className="card border-primary-subtle mb-4">
                    <div className="card-body p-4">
                      <h5 className="mb-2 fw-bold">🎙️ Voice Recorder</h5>
                      <p className="text-muted mb-3">Record your voice to use directly for narration.</p>

                      {/* Recording Status */}
                      {isRecording && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
                          <span
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background: "red",
                              display: "inline-block",
                            }}
                          />
                          <strong>Recording in progress...</strong>
                          <span className="ms-auto fw-bold">{recordingTime}s</span>
                        </div>
                      )}

                      {/* Start Recording */}
                      {!isRecording && !recordedAudioUrl && (
                        <button type="button" className="btn btn-danger btn-lg w-100" onClick={startRecording}>
                          🎙️ Start Recording
                        </button>
                      )}

                      {/* Stop Recording */}
                      {isRecording && (
                        <button type="button" className="btn btn-dark btn-lg w-100" onClick={stopRecording}>
                          ⏹️ Stop Recording
                        </button>
                      )}

                      {/* Recorded Audio Preview */}
                      {recordedAudioUrl && !isRecording && (
                        <div className="mt-3">
                          <label className="form-label fw-bold">Your Recording Preview</label>
                          <audio controls src={recordedAudioUrl} className="w-100 mb-3" />

                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary flex-grow-1"
                              onClick={resetRecording}
                            >
                              🔄 Record Again
                            </button>

                            <button
                              type="button"
                              className="btn btn-success flex-grow-1"
                              onClick={uploadUserVoice}
                              disabled={uploadingVoice}
                            >
                              {uploadingVoice ? "Uploading..." : "✅ Use This Voice"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Upload Success */}
                      {userVoiceId && (
                        <div className="alert alert-success mt-3 mb-0">
                          ✅ Your voice recording has been uploaded and linked.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Voice Summary */}
                <div className="card bg-light border-0 mb-4">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <small className="text-secondary">Voice Type</small>
                        <div className="fw-bold">{voiceType === "ai" ? "🤖 AI Voice" : "👤 My Voice"}</div>
                      </div>
                      <div className="col-md-4">
                        <small className="text-secondary">Selected</small>
                        <div className="fw-bold">
                          {voiceType === "ai"
                            ? selectedAIVoice === "telugu-male"
                              ? "Telugu Male"
                              : "Telugu Female"
                            : userVoiceId ? "Custom Voice Ready" : "Recording Pending"}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <small className="text-secondary">Scenes</small>
                        <div className="fw-bold">{generatedScript.length} Scenes</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setCurrentStep(2)}>
                    ← Back
                  </button>
                  <button type="button" className="btn btn-primary flex-grow-1" onClick={generateVideoAudio}>
                    🎙️ Generate Audio
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VISUALS EDITOR */}
            {!loading && currentStep === 4 && (
              <div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
                  <div>
                    <span className="badge text-bg-primary mb-2">STEP 4</span>
                    <h2 className="fw-bold mb-1">Visual Editor</h2>
                    <p className="text-secondary mb-0">Choose Pexels images or upload your own images.</p>
                  </div>
                  <span className="badge text-bg-success px-3 py-2">🎙️ Audio Ready</span>
                </div>

                <div className="alert alert-info border-0">
                  <div className="fw-bold mb-1">🖼️ Visual Control</div>
                  <div className="small">
                    You can add one image, three images, five images, or more to every scene. Set how many seconds each image should stay on screen.
                  </div>
                </div>

                <div className="d-flex flex-column gap-4">
                  {visualScenes.map((scene, sceneIndex) => {
                    const images = scene.images || [];
                    const imageDuration = getImageDuration(scene);
                    const sceneDuration = Number(scene.duration || 0);
                    const status = getVisualStatus(scene);

                    return (
                      <div className="card border shadow-sm" key={sceneIndex}>
                        <div className="card-header bg-white">
                          <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                            <div>
                              <span className="badge text-bg-primary mb-2">Scene {scene.sceneNumber || sceneIndex + 1}</span>
                              <h5 className="fw-bold mb-2">{scene.visualDescription}</h5>
                              <small className="text-secondary">Scene duration: {sceneDuration} seconds</small>
                            </div>
                            <div className="text-md-end">
                              {status === "ready" && <span className="badge text-bg-success">✓ Ready</span>}
                              {status === "short" && <span className="badge text-bg-warning">⚠ Add More Time</span>}
                              {status === "empty" && <span className="badge text-bg-danger">No Images</span>}
                              <div className="small text-secondary mt-2">Image time</div>
                              <div className={`fw-bold ${status === "ready" ? "text-success" : "text-danger"}`}>
                                {imageDuration} / {sceneDuration} sec
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="card-body">
                          {scene.audioUrl && (
                            <div className="bg-light rounded-3 p-3 mb-4">
                              <div className="fw-semibold mb-2">🎙️ Scene Audio</div>
                              <audio controls className="w-100" src={getMediaUrl(scene.audioUrl)} />
                            </div>
                          )}

                          <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="fw-bold mb-0">Selected Images</h6>
                              <span className="badge text-bg-light border text-dark">
                                {images.length} image{images.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {images.length === 0 ? (
                              <div className="border rounded-3 bg-light text-center p-5">
                                <div style={{ fontSize: "42px" }}>🖼️</div>
                                <h6 className="fw-bold mt-2">No images selected</h6>
                                <p className="text-secondary mb-0">Search Pexels or upload your own images below.</p>
                              </div>
                            ) : (
                              <div className="row g-3">
                                {images.map((image, imageIndex) => (
                                  <div className="col-sm-6 col-lg-4" key={image.id || imageIndex}>
                                    <div className="card h-100 overflow-hidden">
                                      <div style={{ height: "190px", background: "#f1f5f9" }}>
                                        <img
                                          src={getMediaUrl(image.url)}
                                          alt={`Scene ${sceneIndex + 1} image ${imageIndex + 1}`}
                                          className="w-100 h-100"
                                          style={{ objectFit: "cover" }}
                                        />
                                      </div>
                                      <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                          <span className="badge text-bg-light border text-dark">
                                            {image.source === "local" ? "📁 My Image" : "📸 Pexels"}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => removeImageFromScene(sceneIndex, imageIndex)}
                                          >
                                            🗑️
                                          </button>
                                        </div>

                                        <div className="d-flex gap-2 mb-3">
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary flex-grow-1"
                                            disabled={imageIndex === 0}
                                            onClick={() => moveImage(sceneIndex, imageIndex, "left")}
                                          >
                                            ← Move Left
                                          </button>

                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary flex-grow-1"
                                            disabled={imageIndex === images.length - 1}
                                            onClick={() => moveImage(sceneIndex, imageIndex, "right")}
                                          >
                                            Move Right →
                                          </button>
                                        </div>

                                        <label className="form-label small fw-semibold">Display Duration</label>
                                        <div className="input-group">
                                          <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            value={image.duration || 5}
                                            onChange={(e) => updateImageDuration(sceneIndex, imageIndex, e.target.value)}
                                          />
                                          <span className="input-group-text">sec</span>
                                        </div>
                                        {image.photographer && (
                                          <div className="small text-secondary mt-2">Photo by {image.photographer}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Search / Upload Form */}
                          <div className="card bg-light border-0">
                            <div className="card-body">
                              <h6 className="fw-bold mb-3">Add Visual</h6>
                              <div className="row g-3">
                                <div className="col-lg-8">
                                  <label className="form-label fw-semibold">📸 Search Pexels</label>
                                  <div className="input-group">
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={imageSearchText[sceneIndex] || ""}
                                      onChange={(e) =>
                                        setImageSearchText((prev) => ({
                                          ...prev,
                                          [sceneIndex]: e.target.value,
                                        }))
                                      }
                                      placeholder={scene.visualDescription || formData.topic}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => searchPexelsImages(sceneIndex)}
                                      disabled={pexelsLoading[sceneIndex]}
                                    >
                                      {pexelsLoading[sceneIndex] ? "Searching..." : "🔎 Search"}
                                    </button>
                                  </div>
                                </div>

                                <div className="col-lg-4">
                                  <label className="form-label fw-semibold">📁 Your Images</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="d-none"
                                    ref={(el) => {
                                      fileInputRefs.current[sceneIndex] = el;
                                    }}
                                    onChange={(e) => handleLocalImageUpload(sceneIndex, e)}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary w-100"
                                    onClick={() => openImagePicker(sceneIndex)}
                                    disabled={uploadingImages[sceneIndex]}
                                  >
                                    {uploadingImages[sceneIndex] ? "Uploading..." : "📁 Upload Images"}
                                  </button>
                                  <div className="form-text">Select multiple files at once.</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pexels Results Grid */}
                          {(pexelsResults[sceneIndex] || []).length > 0 && (
                            <div className="mt-4">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="fw-bold mb-0">Pexels Results</h6>
                                <small className="text-secondary">Click an image to add it</small>
                              </div>
                              <div className="row g-3">
                                {pexelsResults[sceneIndex].map((photo) => {
                                  const imageUrl =
                                    photo.src?.medium || photo.src?.large || photo.src?.original || photo.url;
                                  return (
                                    <div className="col-6 col-md-4 col-lg-3" key={photo.id}>
                                      <button
                                        type="button"
                                        className="btn p-0 w-100 text-start"
                                        onClick={() => addPexelsImage(sceneIndex, photo)}
                                      >
                                        <div className="position-relative overflow-hidden rounded-3 border" style={{ height: "150px" }}>
                                          <img
                                            src={imageUrl}
                                            alt={photo.alt || "Pexels image"}
                                            className="w-100 h-100"
                                            style={{ objectFit: "cover" }}
                                          />
                                          <div
                                            className="position-absolute bottom-0 start-0 end-0 text-white px-2 py-2"
                                            style={{ background: "linear-gradient(transparent, rgba(0,0,0,.8))" }}
                                          >
                                            <small className="fw-semibold">+ Add Image</small>
                                          </div>
                                        </div>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="d-flex flex-column flex-md-row gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setCurrentStep(3)}>
                    ← Back to Voice
                  </button>
                  <button type="button" className="btn btn-primary flex-grow-1" onClick={saveVisualsAndContinue}>
                    💾 Save Visuals & Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: FINAL PREVIEW & EXPORT */}
            {!loading && currentStep === 5 && (
              <div>
                <div className="text-center mb-5">
                  <div
                    className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: "72px", height: "72px", fontSize: "32px" }}
                  >
                    🎬
                  </div>
                  <span className="badge text-bg-primary mb-2 d-block mx-auto w-fit">STEP 5</span>
                  <h2 className="fw-bold">Final Video</h2>
                  <p className="text-secondary">Your script, voice and visuals are ready.</p>
                </div>

                {/* Dashboard Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="small text-secondary">SCRIPT</div>
                        <h5 className="fw-bold">{visualScenes.length} Scenes</h5>
                        <span className="badge text-bg-success">✓ Ready</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="small text-secondary">VOICE</div>
                        <h5 className="fw-bold">{voiceType === "ai" ? "AI Voice" : "My Voice"}</h5>
                        <span className="badge text-bg-success">✓ Ready</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="small text-secondary">VISUALS</div>
                        <h5 className="fw-bold">Images Ready</h5>
                        <span className={`badge ${visualsAreReady ? "text-bg-success" : "text-bg-danger"}`}>
                          {visualsAreReady ? "✓ Ready" : "Not Ready"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Production Scene Table */}
                <div className="card border mb-4">
                  <div className="card-header bg-white fw-bold">Final Production Summary</div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Scene</th>
                          <th>Duration</th>
                          <th>Audio</th>
                          <th>Images</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visualScenes.map((scene, index) => {
                          const imageCount = (scene.images || []).length;
                          const imageDuration = getImageDuration(scene);
                          const ready = getVisualStatus(scene) === "ready";

                          return (
                            <tr key={index}>
                              <td>Scene {index + 1}</td>
                              <td>{scene.duration} sec</td>
                              <td>{scene.audioUrl ? "✓ Ready" : "❌ Missing"}</td>
                              <td>
                                {imageCount} images
                                <div className="small text-secondary">{imageDuration} sec</div>
                              </td>
                              <td>
                                {ready ? (
                                  <span className="badge text-bg-success">✓ Ready</span>
                                ) : (
                                  <span className="badge text-bg-danger">❌ Incomplete</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {finalPrepared && !finalVideoUrl && (
                  <div className="alert alert-success">
                    <div className="fw-bold">🎉 Final video generation completed.</div>
                    <div className="small mt-1">The backend finished processing, but no video URL was returned.</div>
                  </div>
                )}

                {finalVideoUrl && (
                  <div className="card border-0 shadow-lg overflow-hidden mb-4">
                    <div className="card-header bg-dark text-white p-3 p-md-4">
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                        <div>
                          <div className="badge text-bg-success mb-2">✓ VIDEO READY</div>
                          <h4 className="fw-bold mb-1">🎬 Final Video Preview</h4>
                          <div className="small text-white-50">
                            Your script, voice and visuals have been compiled into an MP4.
                          </div>
                        </div>
                        <div className="badge text-bg-light text-dark px-3 py-2">MP4</div>
                      </div>
                    </div>

                    <div className="bg-black">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={getMediaUrl(finalVideoUrl)}
                        className="w-100 d-block"
                        style={{
                          maxHeight: "680px",
                          minHeight: "320px",
                          objectFit: "contain",
                          background: "#000",
                        }}
                      />
                    </div>

                    <div className="card-body">
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <div className="bg-light rounded-3 p-3 h-100">
                            <div className="small text-secondary">SCENES</div>
                            <div className="fs-5 fw-bold">{visualScenes.length}</div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="bg-light rounded-3 p-3 h-100">
                            <div className="small text-secondary">VOICE</div>
                            <div className="fs-5 fw-bold">{voiceType === "ai" ? "AI Voice" : "My Voice"}</div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="bg-light rounded-3 p-3 h-100">
                            <div className="small text-secondary">VISUALS</div>
                            <div className="fs-5 fw-bold">
                              {visualScenes.reduce((total, scene) => total + (scene.images || []).length, 0)} Images
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-column flex-md-row gap-2">
                        <a href={getMediaUrl(finalVideoUrl)} download className="btn btn-success btn-lg flex-grow-1">
                          ⬇️ Download MP4
                        </a>

                        <a href={getMediaUrl(finalVideoUrl)} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-lg">
                          ↗ Open Video
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* FINAL ACTIONS */}
                <div className="d-flex flex-column flex-md-row gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setCurrentStep(4)} disabled={loading}>
                    ← Edit Visuals
                  </button>

                  {!finalVideoUrl && (
                    <button
                      type="button"
                      className="btn btn-success btn-lg flex-grow-1"
                      onClick={prepareFinalVideo}
                      disabled={!visualsAreReady || loading}
                    >
                      🎬 Generate Final MP4
                    </button>
                  )}

                  <button type="button" className="btn btn-outline-dark" onClick={resetWizard} disabled={loading}>
                    Create Another
                  </button>
                </div>

                {finalVideoUrl && (
                  <div className="alert alert-success border-0 mt-4 mb-0">
                    <div className="fw-bold">🎉 Your YouTube video is ready!</div>
                    <div className="small">Preview it above, download the MP4, or open it in a new tab.</div>
                  </div>
                )}

                {!visualsAreReady && (
                  <div className="alert alert-warning mt-4 mb-0">
                    ⚠️ Some scenes don't have enough image duration. Go back to Visuals and add more images or increase their duration.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-4">
          <small className="text-secondary">AI Video Creator • Script → Voice → Visuals → Final Video</small>
        </div>
      </div>
    </div>
  );
};

export default CreateVideoWizard;