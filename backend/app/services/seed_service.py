from app.extensions import db
from app.models import (
    Booking,
    Notification,
    ProviderProfile,
    ProviderService,
    Review,
    Role,
    Service,
    ServiceCategory,
    ServiceRequest,
    User,
    UserRole,
)


def seed_demo_data():
    if User.query.first() is not None:
        return

    customer_role = Role(name="CUSTOMER")
    provider_role = Role(name="PROVIDER")
    admin_role = Role(name="ADMIN")
    db.session.add_all([customer_role, provider_role, admin_role])
    db.session.flush()

    customer = User(
        email="customer@mobiserve.ug",
        first_name="Jane",
        last_name="Kintu",
        phone="+256700000001",
    )
    customer.set_password("MobiServeDemo2026!")
    provider = User(
        email="provider@mobiserve.ug",
        first_name="Mike",
        last_name="Nsubuga",
        phone="+256700000002",
    )
    provider.set_password("MobiServeProvider2026!")
    admin = User(
        email="admin@mobiserve.ug",
        first_name="Grace",
        last_name="Muwonge",
        phone="+256700000003",
    )
    admin.set_password("MobiServeAdmin2026!")

    db.session.add_all([customer, provider, admin])
    db.session.flush()

    db.session.add_all([
        UserRole(user_id=customer.id, role_id=customer_role.id),
        UserRole(user_id=provider.id, role_id=provider_role.id),
        UserRole(user_id=admin.id, role_id=admin_role.id),
        UserRole(user_id=admin.id, role_id=provider_role.id),
    ])

    computer_category = ServiceCategory(
        name="Computer Repair",
        slug="computer-repair",
        description="Laptop, desktop, and computer troubleshooting services.",
        icon="laptop",
    )
    plumbing_category = ServiceCategory(
        name="Plumbing",
        slug="plumbing",
        description="Pipe, drain, and water system maintenance.",
        icon="droplet",
    )
    electrical_category = ServiceCategory(
        name="Electrical",
        slug="electrical",
        description="Safe electrical repairs and installations for homes and businesses.",
        icon="zap",
    )
    cleaning_category = ServiceCategory(
        name="Home Cleaning",
        slug="home-cleaning",
        description="Reliable home and apartment cleaning services.",
        icon="sparkles",
    )
    carpentry_category = ServiceCategory(
        name="Carpentry",
        slug="carpentry",
        description="Furniture, doors, and woodwork repairs by local craftspeople.",
        icon="hammer",
    )
    db.session.add_all([
        computer_category,
        plumbing_category,
        electrical_category,
        cleaning_category,
        carpentry_category,
    ])
    db.session.flush()

    laptop_service = Service(
        category_id=computer_category.id,
        name="Laptop Troubleshooting",
        slug="laptop-troubleshooting",
        description="Screen, battery, overheating, and software troubleshooting for laptops.",
        base_price=120000,
    )
    pipe_service = Service(
        category_id=plumbing_category.id,
        name="Pipe Repair",
        slug="pipe-repair",
        description="Pipes, leaks, and water line repairs for homes and shops.",
        base_price=95000,
    )
    electrical_service = Service(
        category_id=electrical_category.id,
        name="Electrical Fault Diagnosis",
        slug="electrical-fault-diagnosis",
        description="Find and safely repair power faults, tripping breakers, and faulty wiring.",
        base_price=80000,
    )
    cleaning_service = Service(
        category_id=cleaning_category.id,
        name="Deep Home Cleaning",
        slug="deep-home-cleaning",
        description="A thorough clean for kitchens, bathrooms, and living spaces.",
        base_price=180000,
    )
    carpentry_service = Service(
        category_id=carpentry_category.id,
        name="Door and Cabinet Repair",
        slug="door-cabinet-repair",
        description="Repair sticking doors, hinges, drawers, and fitted cabinets.",
        base_price=85000,
    )
    db.session.add_all([
        laptop_service,
        pipe_service,
        electrical_service,
        cleaning_service,
        carpentry_service,
    ])
    db.session.flush()

    provider_profile = ProviderProfile(
        user_id=provider.id,
        business_name="Nsubuga TechWorks",
        service_area="Kampala Central",
        location="Kampala, Uganda",
        latitude=0.3476,
        longitude=32.5825,
        description="Certified repair and support provider servicing homes and SMEs.",
        verification_status="verified",
        show_location=True,
        rating=4.8,
        completed_jobs=126,
        response_rate=94.0,
    )

    db.session.add(provider_profile)
    db.session.flush()

    db.session.add_all([
        ProviderService(
            provider_id=provider_profile.id,
            service_id=laptop_service.id,
            experience_years=5,
            hourly_rate=50000,
            is_available=True,
        ),
        ProviderService(
            provider_id=provider_profile.id,
            service_id=pipe_service.id,
            experience_years=3,
            hourly_rate=45000,
            is_available=True,
        ),
    ])

    additional_providers = [
        {
            "email": "daniel@mobiserve.ug",
            "first_name": "Daniel",
            "last_name": "Otema",
            "phone": "+256700000004",
            "business_name": "Otema Electrical Services",
            "service_area": "Nakawa and Ntinda",
            "latitude": 0.3591,
            "longitude": 32.6153,
            "rating": 4.9,
            "completed_jobs": 84,
            "response_rate": 96.0,
            "service": electrical_service,
            "experience_years": 8,
            "hourly_rate": 65000,
        },
        {
            "email": "mariam@mobiserve.ug",
            "first_name": "Mariam",
            "last_name": "Nabirye",
            "phone": "+256700000005",
            "business_name": "Mariam Home Care",
            "service_area": "Ntinda and Kisaasi",
            "latitude": 0.3670,
            "longitude": 32.6200,
            "rating": 4.7,
            "completed_jobs": 73,
            "response_rate": 91.0,
            "service": cleaning_service,
            "experience_years": 6,
            "hourly_rate": 40000,
        },
        {
            "email": "patrick@mobiserve.ug",
            "first_name": "Patrick",
            "last_name": "Ssemanda",
            "phone": "+256700000006",
            "business_name": "Ssemanda Carpentry Works",
            "service_area": "Rubaga and Central Kampala",
            "latitude": 0.3138,
            "longitude": 32.5547,
            "rating": 4.8,
            "completed_jobs": 59,
            "response_rate": 88.0,
            "service": carpentry_service,
            "experience_years": 9,
            "hourly_rate": 55000,
        },
    ]

    for provider_data in additional_providers:
        provider_user = User(
            email=provider_data["email"],
            first_name=provider_data["first_name"],
            last_name=provider_data["last_name"],
            phone=provider_data["phone"],
        )
        provider_user.set_password("MobiServeProvider2026!")
        db.session.add(provider_user)
        db.session.flush()

        additional_profile = ProviderProfile(
            user_id=provider_user.id,
            business_name=provider_data["business_name"],
            service_area=provider_data["service_area"],
            location="Kampala, Uganda",
            latitude=provider_data["latitude"],
            longitude=provider_data["longitude"],
            verification_status="verified",
            show_location=True,
            rating=provider_data["rating"],
            completed_jobs=provider_data["completed_jobs"],
            response_rate=provider_data["response_rate"],
        )
        db.session.add(additional_profile)
        db.session.flush()
        db.session.add(UserRole(user_id=provider_user.id, role_id=provider_role.id))
        db.session.add(ProviderService(
            provider_id=additional_profile.id,
            service_id=provider_data["service"].id,
            experience_years=provider_data["experience_years"],
            hourly_rate=provider_data["hourly_rate"],
            is_available=True,
        ))

    request = ServiceRequest(
        customer_id=customer.id,
        service_id=laptop_service.id,
        title="Laptop keeps shutting down",
        description="My Lenovo laptop shuts off automatically when I open multiple apps. Please inspect and advise.",
        urgency="normal",
        location="Kampala",
        status="completed",
    )
    db.session.add(request)
    db.session.flush()

    booking = Booking(
        service_request_id=request.id,
        customer_id=customer.id,
        provider_id=provider_profile.id,
        agreed_price=150000,
        status="completed",
    )
    db.session.add(booking)
    db.session.flush()

    db.session.add_all([
        Notification(
            user_id=provider.id,
            booking_id=booking.id,
            title="New service request",
            message="A customer in Kampala requested laptop troubleshooting.",
        ),
        Notification(
            user_id=customer.id,
            booking_id=booking.id,
            title="Provider accepted",
            message="Nsubuga TechWorks accepted your service request.",
        ),
        Review(
            booking_id=booking.id,
            customer_id=customer.id,
            provider_id=provider_profile.id,
            rating=5,
            comment="Very professional and quick to diagnose the issue.",
        ),
    ])

    db.session.commit()
