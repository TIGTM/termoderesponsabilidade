
# Etapa 1: compilação
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY TermoTI.API.csproj ./
RUN dotnet restore TermoTI.API.csproj

COPY . ./
RUN dotnet publish TermoTI.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Etapa 2: execução
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "TermoTI.API.dll"]
