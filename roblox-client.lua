-- Roblox Studio example: check the backend and read the next memory event.
-- Enable HTTP requests in Studio: Game Settings > Security > Allow HTTP Requests.

local HttpService = game:GetService("HttpService")

local function requestJson(url, method)
    method = method or "GET"

    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = method,
            Headers = {
                ["Content-Type"] = "application/json"
            }
        })
    end)

    if not success then
        warn("Connection failed:", response)
        return nil, "connection_error"
    end

    if response.Success == false then
        warn("HTTP request failed:", response.StatusCode)
        return nil, response.StatusCode
    end

    local decoded
    local ok, result = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not ok then
        warn("The response was not valid JSON:", response.Body)
        return nil, "invalid_json"
    end

    return result, nil
end

local backendUrl = "https://your-backend.example.com"

local health, healthErr = requestJson(backendUrl .. "/api/health")
if healthErr then
    warn("Health check failed:", healthErr)
else
    print("Backend status:", health.status)
end

local result, resultErr = requestJson(backendUrl .. "/api/director/next")
if resultErr then
    warn("Unable to fetch next memory:", resultErr)
else
    if result.success and result.memory then
        print("Selected memory:", result.memory.name)
        print("Category:", result.memory.category)
        print("Intensity:", result.memory.intensity)
    else
        warn("API returned an unsuccessful response:", result)
    end
end

-- Example with custom write request if you enable API_KEY.
-- local body = HttpService:JSONEncode({ source = "roblox-studio" })
-- local response, err = requestJson(backendUrl .. "/api/test-event", "POST")
-- if err then
--     warn("Test event failed:", err)
-- else
--     print(response.memory and response.memory.name or "No memory selected")
-- end
